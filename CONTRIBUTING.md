# Contribute

Thank you for investing your time in contributing to our project!
Read our [Code of Conduct](https://github.com/Quick-Agency/firebase-extensions/blob/main/CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Reporting issues

### Bugs

If you spot a problem with the docs, [search if an issue already exists](https://github.com/Quick-Agency/firebase-extensions/issues). If a related issue doesn't exist, you can open a new issue using a relevant issue form.

Please follow the issue templates when filing new ones and add as much information as possible.

### Feature requests

Our extensions can be improved upon. If you have a feature request, you can use our Feature Request issue template.

## Make change

When you are ready to develop on the project, fork the repository :

```
git clone https://github.com/Quick-Agency/firebase-extensions/
cd firebase-extensions
npm install
```

Firebase extension can be run locally with the firebase emulators, [see instructions](https://firebase.google.com/docs/emulator-suite) to install and use it.

The [\_emulator](https://github.com/Quick-Agency/firebase-extensions/blob/main/_emulator) folder is setup with all extension to be used as the source forlder for the emulator. A real Firebase project is not required. You only need to login to firebase `firebase login`.

Once login you can run the local emulator : `npm run local:emulator` or the tests suite `npm run test`.

## Pull Requests

When you're finished with the changes, create a pull request, also known as a PR.

- Fill the "Ready for review" template so that we can review your PR. This template helps reviewers understand your changes as well as the purpose of your pull request.
- Don't forget to [link PR to issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
- Enable the checkbox to [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork) so the branch can be updated for a merge.
- We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments. You can apply suggested changes directly through the UI. You can make any other changes in your fork, then commit them to your branch.
- As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
- If you run into any merge issues, checkout this [git tutorial](https://github.com/skills/resolve-merge-conflicts) to help you resolve merge conflicts and other issues.

Read [GitHub's pull request documentation](https://help.github.com/articles/about-pull-requests/) for more information on sending pull requests.
