// Claude Code PreToolUse hook (RUN-09): the agent may not change .env, which
// holds real local secrets. Blocks the file-editing tools on .env and .env.*
// (except .env.example, the committed template), and any shell command that
// names one of those files, since a shell command can write it in too many
// ways to tell a write from a read.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_FILE = /^\.env(\..+)?$/;
const ENV_IN_COMMAND = /(^|[\s'"`/\\=<>|;&(:])\.env(\.[\w.-]+)?(?=$|[\s'"`|;&)<>])/g;

export function isEnvFile(filePath) {
  const name = path.basename(String(filePath).replaceAll('\\', '/'));
  return ENV_FILE.test(name) && name !== '.env.example';
}

export function commandTouchesEnv(command) {
  return [...String(command).matchAll(ENV_IN_COMMAND)].some((m) => m[2] !== '.example');
}

// Returns the reason to block this tool call, or null to let it through.
export function blockReason(toolName, toolInput = {}) {
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    return commandTouchesEnv(toolInput.command ?? '')
      ? 'Shell commands that name .env are blocked: it holds real secrets. Ask the user to make the change themselves.'
      : null;
  }
  const target = toolInput.file_path ?? toolInput.notebook_path;
  return target && isEnvFile(target)
    ? `Editing ${path.basename(target)} is blocked: it holds real secrets. Ask the user to make the change themselves.`
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
