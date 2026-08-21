# Design and Development Workflow

This project is maintained by two AI-assisted developers and a designer who
usually works through Claude Code instead of GitHub. The AI handles Git; the
designer reviews branch previews and decides when work ships.

## The simple model

Each coherent request gets:

1. its own branch;
2. its own preview deployment;
3. as many design iterations as needed; and
4. a production merge only after approval.

`main` is production. A branch is a safe workspace. A preview link shows what
that branch would look like without changing the live site.

## Starting a change

Tell the AI what page or feature to change. It should inspect the repository,
fetch the latest remote state, safely preserve any existing work, and create a
descriptive branch before editing.

Suggested prompt:

> Start a new branch for the pricing-page changes. Fetch the latest remote
> state, preserve any existing work, and tell me the branch name before
> editing.

If somebody has changed `main` since the branch began, the AI merges the latest
`origin/main` into the working branch. It must not overwrite either version to
make a conflict disappear.

## Iterating on a preview

Ask the AI to commit and push a useful version whenever you want to review it.
The hosting service should create or update a preview for the branch.

Suggested prompt:

> Commit and push this version, run the checks, and give me the branch preview
> link. Do not merge it yet.

Feedback stays on that same branch while it remains part of the same coherent
change. A separate page or unrelated feature should start on a new branch.

## Shipping approved work

When the preview is approved, say so explicitly. The AI then fetches the latest
remote state, merges the latest `origin/main` into the feature branch, resolves
any conflicts carefully, and runs the full build. Only passing work is merged
into `main` and pushed for production deployment.

Suggested prompt:

> This preview is approved. Fetch and merge the latest `origin/main`, run the
> full build, merge it into `main`, confirm the production deployment, and
> remove the completed branch when it is safe.

If the branch is unfinished or not approved at the end of the day, the AI
commits and pushes it but does not merge it. Work can continue on the same
branch the next day.

## Starting another request

Suggested prompt:

> Preserve the current work, then update from `origin/main` and create a fresh
> branch for the next request.

This prevents unrelated pages and experiments from accumulating on the same
branch.

## What the AI should report

After each handoff, expect a short summary containing:

- the branch name;
- the latest commit;
- whether checks passed;
- the preview URL, if available; and
- one of: **in progress**, **ready for approval**, or **merged to production**.

If the AI discovers unexpected changes, conflicts, failed checks, or work on
`main` that has not been pushed, it should preserve the work and explain the
situation rather than silently cleaning it up.
