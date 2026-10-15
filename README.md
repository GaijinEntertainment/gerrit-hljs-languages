# gerrit-hljs-languages

A [Gerrit](https://www.gerritcodereview.com/) web plugin that adds [highlight.js](https://highlightjs.org/) languages
to the syntax highlighting of the diff view. Gerrit highlights only the languages that its copy of highlight.js
bundles. This plugin adds the languages of the [Dagor Engine](https://github.com/GaijinEntertainment/DagorEngine), with
the grammars of [dagor-hljs](https://github.com/GaijinEntertainment/dagor-hljs):

| Language | Files             | Grammar package               |
| -------- | ----------------- | ----------------------------- |
| BLK      | `.blk`            | `@gaijin/highlightjs-blk`     |
| Daslang  | `.das`            | `@gaijin/highlightjs-daslang` |
| DSHL     | `.dshl`           | `@gaijin/highlightjs-dshl`    |
| Jam      | `.jam`, `jamfile` | `@gaijin/highlightjs-jam`     |
| Quirrel  | `.nut`            | `@gaijin/highlightjs-quirrel` |

The plugin is one JavaScript file, `hljs-languages.js`. The grammars are inside the file, so the plugin loads nothing
when it runs.

## Installing

The end-to-end tests run the plugin on Gerrit 3.14.2. Other versions of Gerrit are not tested.

1. Download `hljs-languages.js` from a [release](https://github.com/GaijinEntertainment/gerrit-hljs-languages/releases),
   and verify its build provenance:

   ```sh
   gh attestation verify hljs-languages.js --repo GaijinEntertainment/gerrit-hljs-languages
   ```

   Or build `dist/hljs-languages.js`, as [Development](#development) shows.

2. Copy `hljs-languages.js` into the `plugins` directory of the Gerrit site. Gerrit loads the plugin, named
   `hljs-languages`, at its next scan of the directory (`plugins.checkFrequency`, 1 minute by default) or when it
   starts.
3. Reload the open pages of the web app. The web app loads its plugins when a page loads.

The syntax workers load the grammars from a `blob:` URL. A Content Security Policy that blocks `blob:` scripts stops
the highlighting of every file.

## How it works

The diff view highlights code in web workers, which load highlight.js from the static files of Gerrit. When the web app
loads the plugin, the plugin does two things:

- It gives each syntax worker a script that loads the highlight.js of Gerrit and then registers the grammars.
- It sets the `language` of each side of a diff that the REST API returns, from the file name. Gerrit takes the
  language from the content type of a file, and it knows the content types of its own languages only.

Both steps use internals of the Gerrit web app, not the plugin API: the init message of the syntax workers, and the
path of highlight.js. A new version of Gerrit can change them, and the end-to-end tests find that change.

The diff view shows only the highlight.js classes on its list of safe classes, in the colors of its theme.

## Adding a language

A grammar package must have a script that registers the grammar on the global `hljs`, such as the
`dist/<language>.min.js` file of each dagor-hljs package.

1. Add the package to `devDependencies`.
2. Add the language to `languages.ts`: the name that the script registers, the path of the script in the package, and
   the file names.
3. Add a sample file of the language to `e2e/samples/`. The end-to-end tests fail for a language that has no sample.

## Development

The project uses [Vite+](https://viteplus.dev/) and yarn 4.

```sh
vp install
vp check
vp test run
vp pack
```

`vp pack` writes the plugin to `dist/hljs-languages.js`.

The end-to-end tests build the plugin, start Gerrit in Docker with the plugin installed, and open the diff of each file
of `e2e/samples/` in Chromium. They need Docker:

```sh
vp exec playwright install chromium
vp test run --config e2e/vite.config.ts
```

To test a different version of Gerrit, set `GERRIT_VERSION` to a tag of the `gerritcodereview/gerrit` image, such as
`GERRIT_VERSION=3.14.4`.

## Releasing

Only a repository admin can create a release tag.

1. In a pull request, set `version` in `package.json`. Merge the pull request.
2. Tag the merged commit with `vX.Y.Z`, and push the tag. For 1.2.0:

   ```sh
   git fetch origin
   git tag v1.2.0 origin/main
   git push origin v1.2.0
   ```

3. Watch the run that the tag starts: `gh run watch`.

The tag starts the workflow `.github/workflows/release.yml`. The workflow makes sure that the tag agrees with `version`,
tests and builds the plugin, and creates a GitHub release with the attested `hljs-languages.js`. A version with a
prerelease part, such as `1.2.0-rc.0`, makes a prerelease.

Nobody can move or delete a release tag. If a job fails for a reason outside the repository, run the failed jobs again.
If the fix needs a commit, release the next version.

To rehearse a release, start the workflow manually with `gh workflow run release.yml`. The run tests and builds the
plugin, and releases nothing.

## License

[MIT](LICENSE)
