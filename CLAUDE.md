# Working agreements

- Single-user project (owner only). Default to full autonomy on the git/deploy
  workflow: after making a change, commit it, push to GitHub, merge into `main`
  (fast-forward when possible), and let the `deploy.yml` Actions workflow publish
  it to GitHub Pages — all without asking for confirmation first.
- Still stop and ask before anything destructive or hard to reverse: force-push,
  `git reset --hard`, discarding uncommitted work, rewriting published history, or
  deleting branches. Those are not covered by the standing go-ahead above.
- If CI (lint/typecheck/tests/build) fails after a push to `main`, treat it as
  yours to fix — diagnose and push a follow-up fix rather than leaving it red.
