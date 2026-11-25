# Plan: reviewer and ui-check subagents

## Files that change

- `.claude/agents/reviewer.md`: the reviewer (`RUN-10`). Tools: Read, Grep, Glob, Bash. Model: Sonnet. Registers its own PreToolUse hook on Bash and PowerShell.
- `.claude/hooks/reviewer-read-only.mjs`: that hook. A subagent's tool list can allow Bash but not limit it to some commands, so the hook splits the command into words and operators and denies anything that isn't on its read-only list.
- `.claude/agents/ui-check.md`: ui-check (`RUN-11`). Tools: Read, Grep, Glob and 15 named Playwright tools (no typing, form filling, dragging or uploads). Model: Sonnet. Loads the brand skill.
- `.mcp.json`: the Playwright MCP server at project scope, pinned to `@playwright/mcp@0.0.86`, using the installed Chrome and saving files to `.playwright-mcp/`. It runs through `cmd /c npx`, which Claude Code needs for `npx` servers on Windows.
- `scripts/claude-hooks.test.mjs`: tests for the reviewer's hook.
- `docs/spec.md`, `docs/STATUS.md`.

## Risks

- The hook is a guardrail for an agent that means well, not a sandbox. It judges the command text, so it errs towards denying (any `>` outside quotes but `/dev/null`, any `$(`), and the reviewer is told to find another read-only way.
- Claude Code loads new subagents and a new `.mcp.json` only when a session starts, and asks once to approve the new MCP server. Agent-file hooks run only once the folder is trusted.
- `cmd /c` makes `.mcp.json` Windows-only. On macOS or Linux the command is `npx` with the same arguments.
- ui-check uses the person's own database, so it is told not to save, delete, drag or tick anything.

## Proof

### Script tests (`node --test`)

`scripts/claude-hooks.test.mjs`: the reviewer's hook lets through reads (git diff, log, show, grep, `branch --show-current`, pipes into `head` and `sort`, `2>/dev/null`, `>` inside quotes) and denies writes (commit, checkout, stash, reset, push, creating or deleting a branch or tag, `git -c`, `--output`, `git grep -O`, redirects, `tee`, `rm`, `npm`, `node`, `sed -i`, env prefixes, `find -delete` and `-exec`, `sort -o`, `rg --pre`, command substitution, subshells, `<`, an unclosed quote) and PowerShell; run as a script, it prints a deny for `git push` and nothing for `git diff`.

### Checks by hand

- The Playwright server started from the `.mcp.json` command and listed its tools; every tool named in `ui-check.md` is among them.
- After a restart: ui-check on the dashboard and the pipeline, and the reviewer on a commit.

## Traceability

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| RUN-10 | Reviewer subagent, read-only shell | subagents | claude-hooks.test.mjs; by hand (review of a commit) |
| RUN-11 | ui-check subagent with Playwright MCP | subagents | by hand (tool list; check of dashboard and pipeline) |
