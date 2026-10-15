# gerrit-hljs-languages

A Gerrit web plugin, one JavaScript file, that adds highlight.js grammars to the syntax highlighting of the diff view.
The repository is public.

## Where things live

- `languages.ts` - the list of bundled languages: the registered name, the grammar script, and the file names. The
  build, the plugin, and the tests read the languages from it.
- `grammar-scripts.ts` - the build plugin that puts the grammar scripts into the bundle as `virtual:grammar-scripts`.
- `src/plugin.ts` - the entry point. `src/syntax-worker.ts` gives the syntax workers the grammars;
  `src/diff-language.ts` sets the language of a diff from its file name.
- `test/` - unit tests. `e2e/` - end-to-end tests against Gerrit in Docker, with one sample file for each language in
  `e2e/samples/` and a Python file that Gerrit highlights without the plugin.

## Rules

- The plugin uses internals of the Gerrit web app, not the plugin API: the init message of the syntax workers, the path
  of highlight.js, and the `language` field of a diff. The comment at each use names its source file in
  `polygerrit-ui/app` of Gerrit. For a new Gerrit version, read those files in that version and run the end-to-end
  tests with `GERRIT_VERSION` set to it.
- The bundle loads nothing at run time: the build puts every grammar script into `hljs-languages.js`.
- A language in `languages.ts` needs a sample file in `e2e/samples/`, and changes the language table of `README.md`.
- `.yarnrc.yml` keeps the minimal package age of yarn for third-party packages. Only `@gaijin/*` packages are exempt,
  so that a new grammar release installs at once.

## Verification

- Run `vp install`, then `vp check` (format, lint, and type check) and `vp test run`.
- Run the end-to-end tests with `vp test run --config e2e/vite.config.ts`. They need Docker and the Chromium of
  Playwright (`vp exec playwright install chromium`).
- A change reaches `main` through a pull request, merged by rebase or squash after the `ci-ok` job of
  `.github/workflows/ci.yml` passes; the `protect-main` ruleset rejects a direct push. Add each new CI job to the
  `needs` list of `ci-ok`.
- A workflow pins each action to the commit SHA of a release and names the release in a comment
  (`actions/checkout@<sha> # v7.0.1`), which Dependabot reads to update both. A checkout sets
  `persist-credentials: false`.

## Public repository

- Files and commit messages hold no internal context: no internal hosts, no links to internal Gerrit changes or tracker
  issues, and no local paths. Cite a source only when it is public.
