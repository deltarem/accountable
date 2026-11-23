# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far
- `docs/frontend-architecture.md`: how the React app is put together
- `docs/backend-architecture.md`: how the FastAPI app and its data are put together

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` before calling any piece of work done, and fix every failure until it passes. It runs all five suites in order, keeps going if one fails, prints a PASS/FAIL summary, and exits with 1 if any failed:

1. the traceability check (`scripts/check-trace.mjs`)
2. the script tests (`node --test`)
3. the backend unit tests (pytest)
4. the frontend unit tests (Vitest)
5. the end-to-end tests (Playwright with the installed Chrome)

The whole run takes about 8 minutes. The end-to-end tests start their own servers on ports 8100 and 5273 with their own database, so nothing else needs to be running and your data is never touched. To run only some suites while working, name them: `node scripts/test-all.mjs test:backend test:frontend`.
