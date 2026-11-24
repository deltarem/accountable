# Plan: hooks for commits and the coding agent

## Files that change

- `package.json`: `lefthook` as a dev dependency, and a `prepare` script that runs `lefthook install`. npm holds back lefthook's own install script until it is approved, so `prepare` is what installs the git hook on `npm install`.
- `lefthook.yml`: the pre-commit hook (`RUN-07`). Formatting runs first and re-stages its fixes (`stage_fixed`), then lint, types and gitleaks run in parallel. It uses the doublestar glob matcher, because the default one doesn't let `backend/**/*.py` match `backend/x.py`.
- `.claude/hooks/check-on-stop.mjs`: the Stop hook (`RUN-08`). It returns `{"decision": "block"}` with the failed steps' output, and does nothing when `stop_hook_active` is set.
- `.claude/hooks/protect-env.mjs`: the PreToolUse hook (`RUN-09`).
- `.claude/settings.json`: registers both hooks.
- `scripts/claude-hooks.test.mjs`: unit tests for both agent hooks.
- `docs/spec.md`, `docs/STATUS.md`.

## Risks

- `npm run check:quick` takes about 5 minutes, and the Stop hook runs it at the end of every turn, even one that changed nothing.
- The `.env` guard's shell rule matches the command text, so a command that only mentions `.env` (in a heredoc, say) is blocked too. That's on purpose: there are too many ways to write a file from a shell to tell a write from a read.
- The existing `Read(./.env)` deny rule already stops the file tools on `.env` before the hook runs, so for that one name the hook is a second line.

## Proof

### Script tests (`node --test`)

`scripts/claude-hooks.test.mjs`: the guard blocks the file tools on `.env` and `.env.*` in any folder (Windows and POSIX paths), lets `.env.example` and look-alikes through, blocks shell commands that name `.env` and lets through `process.env`, `$env:` and `.env.example`; the Stop hook exits quietly when `stop_hook_active` is set; the failure report keeps only the failed steps and the summary.

### Checks by hand

- Pre-commit: staged badly formatted TypeScript and Python files and ran the hook; both were formatted and re-staged. A partly staged file kept its unstaged lines out of the commit. `git commit` was refused for an ESLint error, a ruff error, a type error and a fake GitHub token, and HEAD didn't move.
- Stop hook: ran on a clean tree (exit 0, no output) and with a formatting and a lint failure (a block with both failures in the reason).
- `.env` guard, through the live tools in a Claude Code session: Write on `frontend/.env.local` and shell commands naming `.env` were blocked.

## Traceability

| ID | Requirement | Phase | Proof |
|---|---|---|---|
| RUN-07 | Pre-commit hook: format, lint, types, secrets | harness | by hand (commits refused and fixes re-staged) |
| RUN-08 | Stop hook runs check:quick, blocks once | harness | claude-hooks.test.mjs; by hand (clean and failing runs) |
| RUN-09 | Agent can't change .env | harness | claude-hooks.test.mjs; by hand (live Write and shell) |
