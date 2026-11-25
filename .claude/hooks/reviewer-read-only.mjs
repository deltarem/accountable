// Claude Code PreToolUse hook for the reviewer subagent (RUN-10): its shell may
// only read. A subagent's tool list can allow Bash but can't limit it to some
// commands, so this hook denies any command that isn't on the read-only list
// below, redirects into a file, or runs another command inside itself.
// It is a guardrail for an agent that means well, not a sandbox.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Commands that only read, whatever their arguments, apart from the flags below.
const READERS = new Set([
  'cat', 'head', 'tail', 'ls', 'wc', 'grep', 'egrep', 'fgrep', 'rg', 'find', 'cut', 'diff',
  'sort', 'tr', 'pwd', 'echo', 'stat', 'basename', 'dirname', 'realpath', 'cd', 'true',
]);

// Flags that make a reader write a file or run another program.
const WRITING_FLAGS = {
  find: /^-(exec|execdir|ok|okdir|delete|fprint|fprint0|fprintf|fls)$/,
  rg: /^--pre(-glob)?(=|$)/,
  sort: /^(--output|-[^-]*o)/,
};

// git subcommands that only read.
const GIT_READS = new Set([
  'diff', 'log', 'show', 'status', 'grep', 'blame', 'shortlog', 'ls-files', 'ls-tree', 'rev-parse',
  'rev-list', 'merge-base', 'cat-file', 'describe', 'name-rev', 'diff-tree', 'range-diff',
]);

// git subcommands that only read when they list, and the test for that.
const BRANCH_LONG_FLAGS = new Set(['--show-current', '--all', '--remotes', '--verbose', '--list', '--no-color']);
const GIT_LISTS = {
  branch: (args) => args.every((a) => /^-[arv]+$/.test(a) || BRANCH_LONG_FLAGS.has(a)),
  tag: (args) => args.length === 0 || (['-l', '--list'].includes(args[0]) && args.slice(1).every((a) => !a.startsWith('-'))),
  stash: (args) => ['list', 'show'].includes(args[0]),
  remote: (args) => args.every((a) => a === '-v' || a === '--verbose'),
  worktree: (args) => args[0] === 'list',
};

// Redirects that write nowhere: 2>/dev/null, >/dev/null, &>/dev/null, 2>&1.
const HARMLESS_REDIRECT = /^(&?>>?\s*\/dev\/null|>&[12])(?=$|[\s|&;])/;

const SUBSTITUTION = 'runs a command inside the command ($(...) or backticks)';

// Splits a command into words and operators the way a POSIX shell would, near
// enough to judge it. Returns { tokens } or { problem } for what it won't judge.
export function tokenize(command) {
  const s = String(command);
  const tokens = [];
  let word = null;
  let quote = null;
  const endWord = () => {
    if (word !== null) tokens.push(word);
    word = null;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
      continue;
    }
    if (c === '`' || (c === '$' && s[i + 1] === '(')) return { problem: SUBSTITUTION };
    if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === '\\' && '"\\$`'.includes(s[i + 1])) word += s[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      word ??= '';
    } else if (c === '\\') {
      word = (word ?? '') + (s[i + 1] ?? '');
      i++;
    } else if (c === '>' || c === '<' || (c === '&' && s[i + 1] === '>')) {
      const harmless = c !== '<' && s.slice(i).match(HARMLESS_REDIRECT);
      if (!harmless) return { problem: 'redirects into or out of a file' };
      if (word !== null && /^\d$/.test(word)) word = null;
      endWord();
      i += harmless[0].length - 1;
    } else if ('|&;\n'.includes(c)) {
      endWord();
      const pair = s.slice(i, i + 2);
      if (pair === '||' || pair === '&&') {
        tokens.push(pair);
        i++;
      } else tokens.push(c === '\n' ? ';' : c);
    } else if (c === '(' || c === ')') {
      return { problem: 'runs a subshell' };
    } else if (/\s/.test(c)) {
      endWord();
    } else {
      word = (word ?? '') + c;
    }
  }
  if (quote) return { problem: 'has a quote that is never closed' };
  endWord();
  return { tokens };
}

function gitProblem(args) {
  let i = 0;
  while (args[i] === '--no-pager' || args[i] === '-C') i += args[i] === '-C' ? 2 : 1;
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (sub === undefined) return '`git` needs a subcommand';
  const writing = rest.find((a) => /^--output(=|$)/.test(a) || (sub === 'grep' && /^(-O|--open-files-in-pager)/.test(a)));
  if (writing) return `\`git ${sub} ${writing}\` writes a file or opens another program`;
  if (GIT_READS.has(sub)) return null;
  if (GIT_LISTS[sub]?.(rest)) return null;
  return `\`git ${[sub, ...rest].join(' ')}\` can change the repository`;
}

function commandProblem(words) {
  const [program, ...args] = words;
  if (program === 'git') return gitProblem(args);
  if (!READERS.has(program)) return `\`${program}\` isn't on the reviewer's list of commands that only read`;
  const flag = WRITING_FLAGS[program] && args.find((a) => WRITING_FLAGS[program].test(a));
  return flag ? `\`${program} ${flag}\` can write a file or run another program` : null;
}

// Returns why the command isn't read-only, or null when it only reads.
export function readOnlyProblem(command) {
  const { tokens, problem } = tokenize(command);
  if (problem) return `the command ${problem}`;
  const commands = [[]];
  for (const token of tokens) {
    if (['|', '||', '&&', ';', '&'].includes(token)) commands.push([]);
    else commands.at(-1).push(token);
  }
  for (const words of commands.filter((w) => w.length > 0)) {
    const found = commandProblem(words);
    if (found) return found;
  }
  return null;
}

// Returns the reason to block this tool call, or null to let it through.
export function blockReason(toolName, toolInput = {}) {
  if (toolName === 'PowerShell') return 'The reviewer uses Bash, limited to commands that only read.';
  if (toolName !== 'Bash') return null;
  const problem = readOnlyProblem(toolInput.command ?? '');
  return problem
    ? `The reviewer only reads, and ${problem}. Use Read, Grep or Glob, or a read-only command such as git diff, git log, git show, git grep, grep, cat, head or ls.`
    : null;
}

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const reason = blockReason(input.tool_name, input.tool_input);
  if (!reason) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
