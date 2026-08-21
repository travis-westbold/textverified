# Claude Code Instructions

Read and follow `AGENTS.md` before changing files. `AGENTS.md` is the
authoritative workflow for this repository.

The designer does not manage Git directly. Claude Code is responsible for:

- checking the current branch and worktree before editing;
- fetching `origin` and synchronizing from `origin/main` when it is safe;
- creating a branch for each coherent change;
- preserving unexpected or existing work rather than discarding it;
- committing and pushing useful checkpoints;
- reporting the branch name, checks, and preview URL;
- leaving unapproved work on its branch; and
- merging into `main` only after explicit approval such as "ship it".

When the designer asks for another unrelated change, finish or preserve the
current branch first, update from `origin/main`, and create a new branch. Never
continue unrelated work directly on the previous feature branch or on `main`.

