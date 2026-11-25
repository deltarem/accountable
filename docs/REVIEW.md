# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Matches spec.md and plan.md:** the change does what `docs/spec.md`, the area files in `docs/specs/` that it touches, and its `plan.md` say, with nothing missing and nothing extra.
- **Described by spec.md:** flag any code that `docs/spec.md` and its area files don't describe: either the spec is missing something the product does, or the code does something nobody asked for. Also flag a change that alters behaviour without updating the area file that describes it, and a requirement ID in an area file that isn't listed in the index in `docs/spec.md`.
- **Follows STANDARDS.md:** the change meets `docs/STANDARDS.md`. Anything on its "What I won't accept" list is an Important finding.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
