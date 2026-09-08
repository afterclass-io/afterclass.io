# AfterClass Contributing Guide

Thank you for your interest in contributing to AfterClass!

This project was created by students for students, aiming to enrich the academic
experience of Singaporean university students by providing up-to-date course and
professor related analytics.

There are many ways to contribute, from writing tutorials or blog posts,
improving the documentation, submitting bug reports and feature requests or
writing code for AfterClass. Every small bit helps us out immensely.

We welcome contributions from the community to help make this project even
better. Before submitting your contribution to this project, please read through
the following guide. We also suggest you read the [Project
Philosophy](PHILOSOPHY.md.md) in our documentation.

## Code of Conduct

Please review and adhere to the [Code of Conduct](CODE_OF_CONDUCT.md) when
participating in this project.

## Our Philosophy

Refer to our [Project Philosophy](PHILOSOPHY.md) for the standards that we
adhere to.

## Open Development

All work on AfterClass happens directly on
[GitHub](https://github.com/AfterClass-io/afterclass.io-v2). Both core team
members and external contributors send pull requests which go through the same
review process.

## Getting Started

If you're a beginner, lots of technical terms in this guide may be foreign to
you. Don't worry, we were once in your shoes too. Take it one step at a time and
do some research. Please feel free to get in touch with us if you need any help.

Along the way, if you find details that are missing or wrong, or you would like
to improve this guide, feel free to submit a pull request.

## How to Contribute

### Questions

If you have questions about usage, help or support, please use our dedicated
community forum at [GitHub
Discussions](https://github.com/AfterClass-io/afterclass.io-v2/discussions/categories/q-a)
or reach out to any of the core maintainers.

> [!IMPORTANT]
> If you choose to instead open an issue for your question, your
> issue will be immediately closed and redirected to the forum.

### Reporting Issues

If you have found what you think is a bug, please [file an
issue](https://github.com/AfterClass-io/afterclass.io-v2/issues/new/choose).

> [!IMPORTANT]
> Issues that are identified as implementation questions or
> non-issues will be immediately closed and redirected to [GitHub
> Discussions](https://github.com/AfterClass-io/afterclass.io-v2/discussions).

### Feature Requests

If you have suggestions for improvements, please use our dedicated community
forum at [GitHub
Discussions](https://github.com/AfterClass-io/afterclass.io-v2/discussions/categories/ideas).
From there, we will discuss use-cases for the feature and then finally discuss
how it could be implemented.

> [!IMPORTANT]
> If you choose to instead open an issue for your question, your
> issue will be immediately closed and redirected to the forum.

### Submitting Pull Requests

See [Pull Request Guide](#pull-request-guide) below.

#### Your First Pull Request

Working on your first Pull Request? See **[contributing to a project on
GitHub](https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project)**

To help you get your feet wet and get you familiar with our contribution
process, we have a list of **[good first
issues](https://github.com/AfterClass-io/afterclass.io-v2/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)** that
contain tasks with a relatively limited scope. This is a great place to get
started.

If you decide to fix an issue, please be sure to check the comment thread in
case somebody is already working on a fix. If nobody is working on it at the
moment, please leave a comment stating that you intend to work on it so other
people don’t accidentally duplicate your effort.

If somebody claims an issue but doesn’t follow up for more than two weeks, it’s
fine to take it over but you should still leave a comment.

## Pull Request Guide

Follow the Pull Request Template provided in the repository when opening a Pull
Request.

### General

- Checkout a topic branch from a base branch (e.g. `main`), and merge back
  against that branch. See [RFC#66: Branching
  Strategy](https://github.com/AfterClass-io/afterclass.io-v2/discussions/66).
- If adding a new feature:
  - Add accompanying test case or storybook, if it's a ui-related change.
  - Provide a convincing reason to add this feature
    - Ideally, you should open a suggestion discussion first, and have it
      approved before working on it.
- If fixing a bug:
  - If you are resolving a special issue, add `(fix #xxxx[,#xxxx])` (`#xxxx` is
    the issue id) in your PR title/description for a better release log.
  - Provide a detailed description of the bug in the PR. Live demo preferred.
  - Add appropriate test coverage if applicable.
- It's OK to have multiple small commits as you work on the PR. GitHub can
  automatically squash them before merging.
- Make sure tests pass! `bun run test` runs the mocked-`db` unit suite (no
  Docker required). `bun run test:integration` runs the real-Postgres
  integration suite via Testcontainers and needs a running Docker daemon.
- No need to worry about code style as long as you have installed the dev
  dependencies and recommended dev setup. Modified files are automatically
  formatted with Prettier on save.
- PR title MUST follow the [commit message
  convention](./.github/commit-convention.md) so that changelogs can be
  automatically generated.

### Semantic Commit Messages

We generally follow the standard [Semantic Commit
Messages](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716):

Format: `<type>(<scope>): <subject>`

`<scope>` is optional

#### Example

```txt
feat: add hat wobble
^--^  ^------------^
|     |
|     +-> Summary in present tense.
|
+-------> Type: chore, docs, feat, fix, refactor, style, or test.

```

More Examples:

- `feat`: new feature for the user, not a new feature for build script
- `fix`: bug fix for the user, not a fix to a build script
- `docs`: changes to the documentation
- `style`: formatting, missing semi colons, etc; no production code change
- `refactor`: refactoring production code, eg. renaming a variable
- `test`: adding missing tests, refactoring tests; no production code change
- `chore`: updating grunt tasks etc; no production code change

#### References:

- https://www.conventionalcommits.org/
- https://seesparkbox.com/foundry/semantic_commit_messages
- http://karma-runner.github.io/1.0/dev/git-commit-msg.html

## Reviewing Pull Requests

Code reviews prevent potential (future) bugs early on and it is an effective way
to communicate changes and sharing learnings within a team.

- Everyone can participate in a code review
- Leave any comments on the Pull Request or [directly on the
  code](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request#adding-comments-to-a-pull-request).

### How to Review

- Make two passes over the PR if it's substantial.
  - On the first pass, come to an understanding of the code change at a high
    level.
  - On the second pass, pay more attention to semantic details.
- When leaving comments, ensure they are actionable and clear. As a general
  guide, comments should be:

  - Specific: Point to a particular line or a few lines of code
  - Actionable: Suggest a specific improvement
  - Constructive: Aim to help the author improve their code

  Refer to [conventional comments](https://conventionalcomments.org/) for more
  details.

### Flavours of Reviews

An effective code review would cover all major aspects of good code, that are:

1. General (Low level) — Effective use of CS concepts, hygiene, language
   constructs and its ecosystem
2. Design — Adherence to design principles and patterns (Esp. when new module is
   being developed) and adherence to the existing design (in case of incremental
   development)
3. Functionality — Coverage of business use cases and test cases to support it

#### General Review

General review can be done by anybody in the team. At this level, the
expectation is to review the code from solely implementation tech point of view:

- Effective use of various CS concepts such as DS/Algo, Concurrency, Locking
  etc. Review algorithms and ensure sufficient documentation. Lookout for
  opportunities of optimisations. Ensure there are unit tests for both possible
  and impossible state of the application.
- Effective use of language constructs and best practices. Most of the best
  practices are summarised in some of the popular books such as *Effective Java,
  Code Complete, Pragmatic Programmer, Java Concurrency in Practice* *etc*.
- Effective use of language ecosystem such as standard libraries (data
  structures etc), unit test frameworks etc. We should encourage reuse of battle
  tested code as much as possible.
- Hygiene such as style guide, documentation, type safety, resource management,
  object construction, DI, validations etc.

#### Code Design Review

In this phase, the reviewer needs to be familiar with the domain to justify the
design choices. Depending on the nature of the change, the review can have
different expectations:

- When a new product is released: Ensure that the code adheres to the design
  document drafted prior to implementation (encourage reviewees to submit one if
  not present). In any unexpected cases where the design doc is not already
  reviewed or there is no design doc, the reviewer needs to review the contracts
  to ensure they model the domain properly.
- When changes are in existing product: The reviewer must ensure that the
  changes adhere to the established design of the product. And that the change
  honours the constraints of the product or affects all the constraints
  uniformly (rather than conditionally)

On a general note, the review must ensure:

- DRY — don’t repeat yourself — reviewer needs to ensure DRYness of logic and
  abstraction rather than just code.
- Single Responsibility Principle (SRP) — Functions are modular, concise and
  handle one and only one concern
- Interfaces communicate a clear intention, without useless methodsSeparation of
  concerns needs to be reviewed here.
- Designed for concurrent environment — objects declare thread safety contracts
- OOPs tenets — identification of state and it’s encapsulation, responsibility
  of the objects and the protocol of communication between the objects
- Design is extensible; one popular way is to ensure right design pattern are
  used if there was an opportunity (for eg: algos should be pluggable through
  Strategy pattern et al)
- Testability — the functionality must be unit testable.

> [!NOTE]
> Please note that this list is not exhaustive and the reviewer should
> use their discretion to evaluate the design based on the context and needs of
> the change.

#### Functional Review

This is the most important step of the review. Reviewer must be familiar and
contributor to the product and understands the features and constraints alike.
Apart from dedicated regression suite, reviewer’s familiarity gives unique
opportunity to uncover unforeseen scenarios. Here reviewer need to ensure that
there are no regressions because of the change. Additionally, reviewer should
review the unit tests and integration tests and make sure they test the
behaviour of the functionality in all possible states of the application
(possible and impossible state)

Formally, reviewer need to ensure that

1. The Domain Modelling is done right (in case LLD - CD/ERD etc are not
   thoroughly reviewed)
2. The code is sufficiently instrumented (biz and system instrumentation)
3. the relationships between abstractions and classes are clearly laid out (and
   easily derivable from the code)
4. Security aspects such as> Input and output validation> Defence against known
   vulnerabilities> Boundary checks (Eg array OOB) that may cause overflows and
   DoS> Vulnerabilities in platforms and libraries (basic audit of known issues
   should do)

### Examples

```jsx
var commentCount = 0;
//^^^
//! should be let instead of var
```

You might suggest that this be a `let` instead of `var`.

## License

This project is licensed under the [MIT License](LICENSE).
