# Add the GridLock demo to our shared project

I'll send you a pull request (PR). A PR is a request to add changes to our shared project. This first one adds the GridLock demo so everyone has the same starting point.

## Accept the initial demo

1. Open the PR link I send you.
2. At the bottom, use the arrow beside the merge button and choose **Create a merge commit** if it isn't already selected.
3. Click **Merge pull request**, then **Confirm merge**.

This puts the demo on `main`, our shared version of the project. Choosing a merge commit also keeps the record of how the demo was built. If GitHub blocks the merge, send me the message it displays.

## Give everyone access

Open **Settings → Collaborators → Add people** and invite any missing teammates by their GitHub usernames. They need to accept the invitation before they can upload their changes.

## How we'll work afterward

Each teammate starts a branch from `main` for a task. A branch lets you work on your changes without changing everyone else's shared version. For example, `feature/map-filters` could hold improvements to the map filters.

When a task is ready, its author opens a PR. For these later changes, another teammate reviews it before it is added to `main`. Everyone then gets the updated shared version before starting their next task. The commands are in [the team guide](../CONTRIBUTING.md).

Before that ongoing work begins, protect `main` so changes go through PRs: **Settings → Rules → Rulesets → New ruleset → New branch ruleset**. Name it `Protect main`, set it to **Active**, target the default branch (`main`), and leave the bypass list empty. Enable **Require a pull request before merging** with **1 approval**, **Block force pushes**, and **Restrict deletions**. Save it. This makes teammate review part of future changes and prevents accidental replacement or deletion of the shared branch.

GitHub references, checked September 26, 2026: [merging a PR](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request), [inviting teammates](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository), [creating a ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).
