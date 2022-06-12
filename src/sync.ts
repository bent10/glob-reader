import { join } from 'node:path'
import { readFileSync, statSync } from 'node:fs'
import { globbySync } from 'globby'
import { File } from './File.js'
import { Options } from './types.js'

/**
 * Expands glob patterns for iterative file and text processing.
 *
 * ```js
 * const files = readGlobSync('./src/**\/*.{md,mdx,liquid}')
 * for (const file of files) {
 *   // processing file here...
 *   console.log(file)
 *
 *   file.rename({ extname: '.html', dirname: 'dist' })
 *   await file.writeSync() // writes to ./dist directory
 * }
 * ```
 */
export function* readGlobSync(
  patterns: string | readonly string[],
  options?: BufferEncoding | Options
): Generator<File> {
  const {
    encoding,
    stripMatter = false,
    dry = false,
    fsStats = false,
    cwd = process.cwd(),
    ...globOptions
  } = typeof options === 'string' ? { encoding: options } : options || {}
  const paths = globbySync(patterns, { ...globOptions, cwd, onlyFiles: true })

  for (const filepath of paths) {
    const [value = '', stat = {}] = dry
      ? []
      : [
          readFileSync(join(cwd, filepath), encoding),
          fsStats ? statSync(join(cwd, filepath)) : {}
        ]

    yield new File({
      cwd,
      path: filepath,
      value,
      data: { stat },
      stripMatter,
      dry
    })
  }
}
