# Working together on GridLock

Use one stable branch and one short-lived branch per task. Everyone works in their own clone. A branch belongs to a specific change, rather than becoming a permanent personal copy of the app. This follows [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow).

## Current setup

The shared repository is **[yeagarjack/FIUSHELLHACKSSquadRepo](https://github.com/yeagarjack/FIUSHELLHACKSSquadRepo)** and its default branch is **`main`**. Use `main` as the base for every team pull request.

At setup time the remote contains only its existing placeholder file; the GridLock demo is local. The prepared `setup/team-workflow` branch joins the two histories without removing that file. After the team publishes and merges this initial branch, everyone can clone the complete application. For this initial import, use a merge commit to retain the application's creation history; use squash merges for later task pull requests. A local commit or remote URL alone does not upload files.

The GitHub Actions workflow and pull-request template are prepared. Hosted checks, invitations and branch protection still need their first hosted run and repository-owner configuration. The current authenticated account has write access, not administrator access.

## Four responsibilities, with small task branches

These branch names are examples for the next task in each area, not four permanently open branches. Claim a small task in the team chat before starting and name one reviewer.

| Owner                      | Main area                                            | Example task branch        | Coordination                                                              |
| -------------------------- | ---------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| 1 — Map and interface      | `src/components/ProjectMap.tsx`, styles and controls | `feature/map-interactions` | Coordinate changes to `src/App.tsx`; it is the shared integration file.   |
| 2 — Data and evidence      | Importers, source annotations and evidence cards     | `data/source-provenance`   | Preserve supplied originals; regenerate derived data with scripts.        |
| 3 — Logic and checks       | `src/lib/comparisons.ts`, scenarios and tests        | `test/scenario-validation` | Agree changes to `src/types.ts` with owners 1 and 2 before coding.        |
| 4 — Demo and documentation | Demo story, README and submission materials          | `docs/demo-notes`          | Verify every claim against the working app; coordinate final demo freeze. |

One teammate acts as merge coordinator at a time. This person can also own a lane. They merge approved pull requests in dependency order and check the combined app. Another teammate reviews their own pull requests. Package/dependency changes and `package-lock.json` should have one owner at a time.

## Everyday steps

After the initial app pull request has been merged, each teammate clones it once:

```sh
git clone https://github.com/yeagarjack/FIUSHELLHACKSSquadRepo.git
cd FIUSHELLHACKSSquadRepo
npm ci
```

Use the Node version in `.nvmrc`. Before a new task, make sure the current working tree is clean: commit your own unfinished work on its task branch before switching. Do not discard somebody else's work or use `reset --hard` to get a clean checkout.

```sh
# Start a fresh task from the current shared version.
git switch main
git pull --ff-only origin main
git switch -c feature/map-interactions
```

Implement one reviewable change. Commit explicitly selected files; replace the example paths and message below with your actual change:

```sh
git status --short
git add -- src/components/ProjectMap.tsx
git commit -m "feat: improve project map selection"

# These commands are for teammates after the repository is connected.
git push -u origin HEAD
```

Open a **draft pull request** against `main` early so teammates can see what is in progress. Include the user-visible result, files that overlap another person's work, and how the change was checked. Mark it ready when the task is complete.

Before requesting review, bring in the latest shared changes while on your task branch:

```sh
git fetch origin
git merge origin/main
npm ci
npm run format:check
npm test
npm run build
git diff --check
```

If the merge conflicts, stop and resolve the affected lines with the other author. Keep both intended behaviors, rerun relevant checks, stage the resolved paths, and finish the merge commit. `git merge --abort` can cancel that in-progress merge when needed. Avoid rebasing or force-pushing branches other people already use.

The pull-request author requests **one teammate's approval**. The merge coordinator waits for the required checks and resolved comments, uses **Squash and merge**, and gives the resulting commit a clear Conventional Commit subject (`feat:`, `fix:`, `docs:`, `test:` or `chore:`). Coordinate any shared-file conflict before merging. Afterward, start the next task on a fresh branch from the updated stable branch; do not continue new work on the old squashed branch. Retire merged branches only when their owner agrees they contain no remaining work.

## What to verify

The prepared GitHub workflow runs two checks on pull requests and pushes to the stable branch:

- **GridLock app checks:** locked dependency installation, formatting, tests and production build.
- **GridLock data checks:** workbook normalization and full-report extraction in read-only `--check` mode, ensuring committed data is reproducible.

For UI work, also open the app and check the changed flow on desktop and a narrow screen. For data or scenario work, verify original dates/coordinates stay intact and hypothetical assumptions remain labeled. Automated checks do not replace these specific manual checks. Keep keys in ignored environment files and commit neither dependencies nor build output.

## Repository owner setup

After the initial branch is pushed and its pull request is opened, the owner should follow [the exact owner checklist](docs/REPOSITORY_OWNER_SETUP.md). It covers teammate invitations, Actions permissions, the first successful checks, protection of `main`, approval and the initial merge commit, then the everyday squash policy.

The owner must apply these GitHub settings; committing the workflow or this guide does not activate branch protection. Our shared repository is public, and GitHub's documented rulesets support public repositories on GitHub Free.

If people or coding agents work simultaneously on one machine, give each a separate Git worktree. Switching branches in a folder another person is editing also switches the files underneath them.

## Keep the demo recoverable

Merge small completed changes throughout the day rather than integrating four large branches at the end. Preserve the final rehearsal and submission buffer in [the demo handoff](docs/DEMO_HANDOFF.md). Freeze new features before the final rehearsal; only reviewed demo blockers should land afterward.

Keep `package.json` and `CHANGELOG.md` aligned when cutting an actual release: patch for fixes, minor for backward-compatible features, and major for breaking changes. The current release is 0.1.0. The merge coordinator can tag a verified demo commit with the next agreed, unused version so the team can reproduce it. Branch names describe work; version tags identify tested releases.
