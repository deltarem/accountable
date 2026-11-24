# Intent: hooks for commits and the coding agent

Catch problems before they reach a commit or the end of an agent's turn, without slowing either down much.

- A lefthook pre-commit hook that formats the staged files, then runs lint, types and gitleaks. It skips the tests, so it stays quick.
- A hook for the coding agent (Claude Code) that runs `npm run check:quick` when it finishes a turn and sends any failure back to it to fix. It blocks once and then lets the agent stop, so it can't loop forever.
- A hook for the coding agent that blocks any edit to `.env`.

Each one is tested, and the report says how.
