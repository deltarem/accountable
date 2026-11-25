# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: read this first. It summarises the whole product as it stands today: the problem, who uses it, the constraints and the success criteria. Its index says which file in `docs/specs/` holds each area's detail.
- `docs/specs/<area>.md`: the detail, one file per area (deals, pipeline, design, architecture and so on). After `docs/spec.md`, read only the area files the current change touches.
- `docs/changes/<branch name>/`: one folder per change, named after its git branch, holding:
  - `intent.md`: what the change should achieve
  - `plan.md`: how it will be built and tested.

  Read only the current change's folder: the one named after the branch you're on (`git branch --show-current`). The other folders are history. Don't read them, and don't treat them as requirements.
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far
- `docs/STANDARDS.md`: how code should be written here. Follow it in every change
- `docs/REVIEW.md`: what to check in a code review
- `docs/frontend-architecture.md`: how the React app is put together
- `docs/backend-architecture.md`: how the FastAPI app and its data are put together

Keep the spec up to date in the same change: every area file the change affects, and `docs/spec.md` when the summary changes. A new requirement ID goes into its area file and into the index in `docs/spec.md`, because the traceability check reads IDs from `docs/spec.md` only.

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` before calling any piece of work done, and fix every failure until it passes. It runs all five suites in order, keeps going if one fails, prints a PASS/FAIL summary, and exits with 1 if any failed:

1. the traceability check (`scripts/check-trace.mjs`)
2. the script tests (`node --test`)
3. the backend unit tests (pytest)
4. the frontend unit tests (Vitest)
5. the end-to-end tests (Playwright with the installed Chrome)

The whole run takes about 8 minutes. The end-to-end tests start their own servers on ports 8100 and 5273 with their own database, so nothing else needs to be running and your data is never touched. To run only some suites while working, name them: `node scripts/test-all.mjs test:backend test:frontend`.
