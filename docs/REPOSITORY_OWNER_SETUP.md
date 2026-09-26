# Repository owner checklist: start with the pull request

Prepared September 26, 2026 from GitHub's current documentation. These are recommended settings for our four-person team, not settings already applied to GitHub.

Repository: https://github.com/yeagarjack/FIUSHELLHACKSSquadRepo

Shared branch: `main`. Initial upload branch: `setup/team-workflow`.

Start here when your teammate sends you the initial GridLock pull-request link. The uploader handles pushing `setup/team-workflow` and opening the PR. As the repository owner, follow the steps below: review the PR, check its results, protect `main`, approve and merge, then finish the team settings.

The initial PR contains the GridLock demo, collaboration guide, pull-request template and checks, and retains the existing repository history. These instructions assume the PR has been opened; they do not confirm that it has already been published.

## 1. Open and review the pull request you received

Sign in as `yeagarjack`, the repository owner, and open the PR link your teammate sent. Confirm the PR is in this repository, its **base is `main`**, and its **compare/source is `setup/team-workflow`**. If it is still a draft, ask the uploader to mark it ready for review.

Read the PR description, then open **Files changed**. Review the application changes, source preservation, README, collaboration guide and workflow. Leave any questions or requested fixes on the PR so the uploader can address them in the same branch. Complete steps 2 and 3 before approving and merging in step 4.

## 2. Check the PR's automated results

In **Checks**, wait for these two jobs to finish successfully:

- `GridLock app checks`: formatting, unit tests and production build.
- `GridLock data checks`: reproducible workbook and full-report extraction.

These names come from `.github/workflows/checks.yml`. Local passing checks are not proof of a successful GitHub run. If a job fails, open its logs and have the uploader fix the branch before merging. If checks do not appear, inspect the repository's Actions settings and workflow run first. The rules configuration should reference the actual successful job names; GitHub requires a recent successful result for required checks. [Required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

To check Actions permissions, open **Settings → Actions → General**. Keep Actions enabled. The workflow uses only `actions/checkout`, `actions/setup-node` and `actions/setup-python`; the repository policy must allow those GitHub-authored actions. If using the selected-actions policy, enable its GitHub-created-actions option. Keep workflow token permissions read-only; this workflow does not need permission to write code or approve pull requests. Save any changes, return to the PR and confirm both jobs pass. [GitHub Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

## 3. Protect main before merging this PR

From repository **Settings**, find **Rulesets** under Code and automation (the sidebar may group it under Rules). Choose **New ruleset → New branch ruleset**. Use:

| Setting         | Value                                               |
| --------------- | --------------------------------------------------- |
| Name            | `Protect main`                                      |
| Enforcement     | `Active`                                            |
| Bypass list     | Empty                                               |
| Target branches | Add a target and include the default branch, `main` |

Limit this rule to `main`; teammates must still be able to push their own task branches. Public repositories support these rulesets on GitHub Free, and the owner has the required access. [Create a ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

Enable the following protections:

| Protection                            | Choice                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Restrict deletions                    | On                                                                                                   |
| Block force pushes                    | On                                                                                                   |
| Require a pull request before merging | On; require **1** approval                                                                           |
| Stale approvals                       | Dismiss when new commits change the reviewed diff                                                    |
| Review conversations                  | Require resolution before merging                                                                    |
| Required status checks                | Add `GridLock app checks` and `GridLock data checks`; select GitHub Actions as the source if offered |
| Branch freshness                      | Require the branch to be up to date before merging                                                   |

Leave direct-update restrictions, linear-history enforcement, mandatory signing, code-owner reviews, deployment requirements and additional restrictions off for this setup. In particular, linear-history enforcement would block the initial merge commit, and restricting all updates with an empty bypass list would block normal integration.

Click **Create**, then reopen the rule and confirm it is Active and targets `main`. [Rule behavior and options](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

## 4. Approve and merge the initial PR

Return to the pull request. Confirm both checks are green and any review threads are resolved. If GitHub says the branch is behind `main`, have the uploader update the branch, then wait for checks and review the updated diff again.

As a reviewer who did not author the pull request, open **Files changed → Review changes**, choose **Approve**, and submit the review. The PR author cannot approve their own PR; if the owner opened it, another teammate must supply the approval. [Approval instructions](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews).

Before merging, open **Settings → General**, scroll to Pull Requests, and enable **Allow merge commits** and **Allow squash merging**. Keep merge commits available for this first import so its original development commits remain in `main`, then return to the PR. [Merge-commit settings](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-merging-for-pull-requests); [squash settings](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests).

For **this initial upload**, choose **Create a merge commit** in the merge dropdown, click **Merge pull request**, then **Confirm merge**. That retains the application's creation history as well as the repository's original commit. Do not bypass a failing check. [Merge instructions](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request).

Confirm the PR says Merged and that `main` now contains the application and documentation. Wait for the subsequent push-to-main checks to finish successfully.

## 5. Confirm the rest of the team has access

Open the repository's **Settings**, then **Collaborators** under Access, and choose **Add people**. Invite any of the other three teammates who are missing, using their exact GitHub usernames. Ask them to accept the invitations. A personal repository's collaborators can contribute; they do not need to be repository administrators. If you needed an additional reviewer for step 4, give that teammate access before requesting their review. [GitHub's invitation instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository).

## 6. Set the everyday merge policy

After the initial import succeeds, return to **Settings → General → Pull Requests**. Keep squash merging enabled and disable merge commits and rebase merging for subsequent task PRs. This gives each completed task one clear commit. Keep `main` as the default branch. [Squash configuration](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests).

Tell everyone to read `CONTRIBUTING.md` and start small task branches from the latest `main`. Suggested prefixes are `feature/`, `fix/`, `data/`, `test/` and `docs/`. Have another teammate open the first normal PR and confirm it requires an approval and both checks. This verifies the settings without attempting a direct push to the protected branch.

The owner can then tell the team: “The initial GridLock PR is merged. Main is protected, both checks pass, and everyone can start a task branch from main.” Only send that confirmation after those steps are actually complete.
