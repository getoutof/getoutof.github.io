# Branches

**Source of truth is `dev`.** That branch has `src/`, `package.json`, tests, and workflows.

**`main` is GitHub Pages dist only** (user site, default branch). Do **not** merge source into `main`. Do **not** rewrite `main` by hand. Do **not** edit hashed `assets/index-*.js|css`.

Live game: https://getoutof.github.io/

## How to work

1. Branch from `dev`.
2. Open a PR **into `dev`**, never into `main`.
3. Push to `dev` or `cursor/**` runs Pages: Vite build → publish `dist` onto `main`. `clean: true` drops stale hashed assets; `README.md` and `.nojekyll` on `main` are kept (`clean-exclude`). The `main` README is owned separately (issue #12) — do not replace it from this branch.

Future gameplay/infra PRs target `dev`, not a chain of draft `cursor/**` branches.
