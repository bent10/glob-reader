# glob-reader

Iterative file and text processing.

## Install

```bash
npm i glob-reader
```

## Usage

This package is pure ESM, please read the
[esm-package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

```js
import { readGlob } from 'glob-reader'

const files = readGlob('./src/**/*.md')
for await (const file of files) {
  // processing file here (i.e. transforms markdown to html)
  console.log(file.toString())
  // rename file
  file.rename({ extname: '.html', dirname: './dist' })
  // writes .html file to ./dist directory
  await file.write()
}
```

See the [File](#file) section for more information.

## API

### readGlob

▸ **readGlob**(`patterns`, `options?`): `AsyncGenerator`<[`File`](#file)>

Asynchronously expands glob patterns for iterative file and text processing.

```js
import { readGlob } from 'glob-reader'
import { transform } from '@swc/core'

const files = readGlob('./src/**/*.{ts,tsx}', 'utf8')
for await (const file of files) {
  // transform ts/tsx to js using `swc`
  const { code } = await transform(file.value)

  file.value = code
  file.rename({ extname: '.js', dirname: './dist' })

  // writes .js file to ./dist directory
  await file.write()
}
```

#### Parameters

| Name       | Type                                                 |
| :--------- | :--------------------------------------------------- |
| `patterns` | `string` \| readonly `string`[]                      |
| `options?` | `BufferEncoding` \| [`Options`](#options-properties) |

#### Returns

`AsyncGenerator`<[`File`](#file)>

### readGlobSync

▸ **readGlobSync**(`patterns`, `options?`): `Generator`<[`File`](#file)>

Expands glob patterns for iterative file and text processing.

```js
import { readGlob } from 'glob-reader'
import sass from 'sass'

const files = readGlobSync('./src/**/*.scss')
for (const file of files) {
  // compile scss to css
  const { css, sourceMap } = sass.compileString(file.toString(), {
    sourceMap: true,
    style: 'expanded'
  })

  // NOTE: We doesn't automatically add a `sourceMappingURL` comment to the `file.value`.
  // It's up to setters to do that, since setters have full knowledge of where the `file.value`
  // and the `file.map` will exist in relation to one another and how they'll be served.
  file.value = `${css}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = sourceMap
  file.rename({ extname: '.css', dirname: './dist' })

  // writes .css and .css.map file to ./dist directory
  await file.writeSync()
}
```

#### Parameters

| Name       | Type                                                 |
| :--------- | :--------------------------------------------------- |
| `patterns` | `string` \| readonly `string`[]                      |
| `options?` | `BufferEncoding` \| [`Options`](#options-properties) |

#### Returns

`Generator`<[`File`](#file)>

### `Options`: Properties

#### cwd

• `Optional` **cwd**: `string`

Base of path.

**`default`** process.cwd()

#### concurrency

• `Optional` **concurrency**: `number`

Specifies the maximum number of concurrent requests from a reader to read directories.

> The higher the number, the higher the performance and load on the file system.
> If you want to read in quiet mode, set the value to a comfortable number or 1.

**`default`** os.cpu().length

#### caseSensitiveMatch

• `Optional` **caseSensitiveMatch**: `boolean`

Enables a [case-sensitive](https://en.wikipedia.org/wiki/Case_sensitivity) mode for matching files.

**`default`** true

#### ignore

• `Optional` **ignore**: `string[]`

An array of glob patterns to exclude matches.

**`default`** []

#### encoding

• `Optional` **encoding**: `BufferEncoding`

The buffer encoding to use when reading files.

**`default`** Buffer

#### stripMatter

• `Optional` **stripMatter**: `boolean`

If `true`, it will removes the YAML front matter from the `file.value`.

**`default`** false

#### fsStats

• `Optional` **fsStats**: `boolean`

If `true`, the file will provides information about the [`fs.Stats`](https://nodejs.org/api/fs.html#class-fsstats).

**`default`** false

#### dry

• `Optional` **dry**: `boolean`

If `true`, it will not read the file contents and stat, also it will prevent write and delete method.

**`default`** false

### `File`

Virtual file object.

```js
const analyze = readGlob('./src/foo.md', { dry: true })

for await (const file of analyze) {
  // raw value
  file.value // => Buffer|string|null
  // encoded value
  file.toString() // => empty string due to `dry: true` option.
  // the byte length of file
  file.bytes // => 0 due to `dry: true` option.
  // human readable byte length of file
  file.size // => '0B'

  // base of path
  file.cwd // => process.cwd() value
  // path of file, can be set using file `path` or file `URL`
  file.path // => './src/foo.md'
  // current name (including extension) of file
  file.basename // => 'foo.md'
  // name (without extension) of file
  file.stem // => '.md'
  // extension (with dot) of file
  file.extname // => '.md'
  // path to parent directory of file
  file.dirname // => './src'

  // renames and mutates the file internally.
  file.rename({ extname: '.html', dirname: './dist' })
  // list of file-paths the file moved between
  file.history // => ['./src/foo.md', './dist/foo.html']

  // place to store custom information.
  file.data // => { matter: {}, stat: {} }
  file.data.stat // => empty data stat due to `dry: true` option.
  // add custom data to file.
  file.data.foo = 'bar' // => { matter: {}, stat: {}, foo: 'bar' }

  // diagnostics storage
  file.messages // => []
  // associates an informational message with the file
  file.info('some information')
  // associates a message with the file
  file.message('`gloob` is misspelt; did you mean `glob`?', {
    line: 2,
    column: 4
  })

  // writes to ./dist/foo.html
  await file.write()
  // removes ./dist/foo.html
  await file.remove()
  // writes to ./dist/foo.html synchronously
  file.writeSync()
  // removes ./dist/foo.html synchronously
  file.removeSync()

  // prints diagnostics to console
  console.log(file.reporter())
  // src/foo.md
  //   1:1  info     some message
  //   2:4  warning  `gloob` is misspelt; did you mean `glob`?
  //
  // 2 messages (⚠ 1 warning)
}
```

Read more information about the file below.

#### `file.dry`

Enable/disable `dry` run for specific file.

```js
const analyze = readGlob('./src/*')

// writes all files to ./dist directory except for foo.md
for await (const file of analyze) {
  // prevent `foo` file from being written but keep processing
  if (file.is('foo')) {
    file.dry = true
  }

  // processing file here...

  file.rename({ extname: '.html', dirname: './dist' })
  await file.write()
}
```

#### `file#is(check)`

Tests if file passes the given `check`.

```js
// file.path = './src/foo.md'
file.is('.md') // => true
file.is('*.md') // => false
file.is('**/*.md') // => true
file.is('**/*.{md,html}') // => true
file.is('**/*.{mdx,jsx}') // => false

file.is({ stem: 'foo' }) // => true
file.is({ stem: { suffix: 'oo' } }) // => true
file.is({ stem: 'bar' }) // => false
```

#### `file#fail(reason[, position][, origin])`

Associates a fatal message with the file, then immediately throws it. Note: fatal errors mean a file is no longer processable.

```js
// use try/catch to handle fatal errors
try {
  file.fail(new ReferenceError('foo is not defined'))
} catch {}

console.log(file.reporter({ defaultName: 'Oh snap!' }))
// Oh snap!
//  1:1  error  ReferenceError: foo is not defined
//  at foo.js:1:1
//  at ...
```

#### `file#reporter(options?)`

Returns diagnostic information about the file.

<details>
<summary>reporter `Options` interface</summary>

```ts
{
  /**
   * Label to use for file without `file.path`. If no `file.path` and no
   * `defaultName` is given, `no name` will show up in the report.
   */
  defaultName?: string

  /**
   * Output long form descriptions of messages, if applicable.
   *
   * @default false
   */
  verbose?: boolean

  /**
   * Do not output anything for a file which has no warnings or errors.
   * The default behavior is to show a success message.
   *
   * @default false
   */
  quiet?: boolean

  /**
   * Only output messages with fatal error. Also sets `quiet` to `true`.
   *
   * @default false
   */
  silent?: boolean

  /**
   * Whether to use color. The default behavior is the check if color is
   * supported.
   */
  color?: boolean
}
```

</details>

## Contributing

We 💛&nbsp; issues.

When committing, please conform to [the semantic-release commit standards](https://www.conventionalcommits.org/). Please install `commitizen` and the adapter globally, if you have not already.

```bash
npm i -g commitizen cz-conventional-changelog
```

Now you can use `git cz` or just `cz` instead of `git commit` when committing. You can also use `git-cz`, which is an alias for `cz`.

```bash
git add . && git cz
```

## Thank you

A project by [Stilearning](https://stilearning.com) &copy; 2022.
