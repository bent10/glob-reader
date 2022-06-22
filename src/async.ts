import { join } from 'node:path'
import { promises as fsp } from 'node:fs'
import fastGlob from 'fast-glob'
import { File } from './File.js'
import { Options } from './types.js'

/**
 * Asynchronously expands glob patterns for iterative file and text processing.
 *
 * ```js
 * import { readGlob } from 'glob-reader'
 *
 * const files = readGlob('./src/**\/*.md')
 * for await (const file of files) {
 *   // processing file here...
 *   console.log(file)
 * }
 * ```
 */
export async function* readGlob(
  patterns: string | string[],
  options?: BufferEncoding | Options
): AsyncGenerator<File> {
  const {
    encoding,
    stripMatter = false,
    dry = false,
    fsStats = false,
    cwd = process.cwd(),
    ...globOptions
  } = typeof options === 'string' ? { encoding: options } : options || {}
  const paths = fastGlob.stream(patterns, {
    ...globOptions,
    cwd,
    onlyFiles: true
  })

  for await (const filepath of paths) {
    const [value = '', stat = {}] = dry
      ? []
      : await Promise.all([
          fsp.readFile(join(cwd, String(filepath)), encoding),
          fsStats ? fsp.stat(join(cwd, String(filepath))) : {}
        ])

    yield new File({
      cwd,
      path: String(filepath),
      value,
      data: { stat },
      stripMatter,
      dry
    })
  }
}
