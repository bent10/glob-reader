/**
 * Iterative file and text processing.
 *
 * ## Install
 *
 * ```bash
 * npm i glob-reader
 * ```
 *
 * ## Usage
 *
 * This package is pure ESM, please read the
 * [esm-package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
 *
 * ```js
 * import { readGlobSync } from 'glob-reader'
 *
 * const files = readGlobSync('./src/**\/*.md')
 * for (const file of files) {
 *   // processing file here...
 *   console.log(file)
 *
 *   file.rename({ extname: '.html', dirname: 'dist' })
 *   file.writeSync() // writes to ./dist directory
 * }
 * ```
 *
 * @module
 */

export * from './types.js'
export { readGlob } from './async.js'
export { readGlobSync } from './sync.js'
export { File } from './File.js'
