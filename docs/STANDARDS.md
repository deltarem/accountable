# Standards

How I want code written in this repo. The architecture docs describe how the app is built. This file covers what I look for in each change.

## What I like

- **Plain code that reads top to bottom.** Small functions, clear names, no cleverness. If a name says what a function does, it needs no comment.
- **Each layer doing its own job.** Routes handle HTTP and call one service. Services hold every rule, one transaction per user action. `lib/` is pure functions. `api/` is the only frontend code that knows a URL. If you're not sure where something goes, the architecture docs decide.
- **One way to do each thing.** Money is integer cents. Today and now come from `backend/clock.py` on the server and `lib/today.ts` in the browser. Database access goes through `db.py`. The stage table lives in `services/stages.py` and `lib/stages.ts`, and the two must stay in step.
- **Libraries over home-made code.** TanStack, Radix, dnd-kit, Recharts, zod and the rest are already here. Use them before writing your own.
- **Comments that explain why.** Write down the reason for anything surprising, and put the requirement ID (`RULE-06`, `ARC-12`) on code that implements a rule from the spec.
- **Errors people can act on.** A failed save says which field is wrong and how to fix it. A failed load shows an error with a way to retry.
- **Tests that check behaviour.** Assert what a user or caller would notice, not how the code gets there. Pure logic gets unit tests. Flows across screens get end-to-end tests.

## What I won't accept

- Business rules in the frontend or in a route.
- Raw SQL, a second engine, or reading the system clock outside `clock.py`.
- Floats for money.
- `fetch` outside `frontend/src/api/`.
- Code that `docs/spec.md` doesn't describe, or features nobody asked for.
- Errors that are swallowed: a bare `except`, an empty `catch`, or logging a failure and carrying on as if it worked.
- Tests that are skipped, loosened or deleted to get a green run. If a test was wrong, fix it and say why in the commit.
- Fixes without a root cause. Show what broke and why before changing anything.
- Dead code, commented-out code, or a `TODO` with no reason.
- `any` or `# type: ignore` without a comment saying why it's needed.
- A new dependency without a reason, or Python run any way other than `uv run`, `uv add`.
- Emojis in code, logs or messages.
- Secrets or real personal data anywhere in the repo. Sample data is made up.
- Colours, fonts or spacing that bypass `styles/tokens.css` and the brand skill. No gradient-heavy styling, no thin border on one edge.
- Refactors mixed into a feature change. Do those separately.

## What good looks like

A change I'd merge without fuss:

- Does what the current `intent.md` and `plan.md` say, and nothing else.
- Is small enough to review in one sitting, and every file it touches has a reason to change.
- Looks like the code around it: same names, same patterns, same folder layout.
- Lets a newcomer follow a request from route to service to table without hunting.
- Comes with a test that would fail without the change, and `npm test` passes.
- Updates `docs/spec.md` and `docs/STATUS.md` in the same change.
