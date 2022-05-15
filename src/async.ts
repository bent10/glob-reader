import { join } from 'node:path'
import { promises as fsp } from 'node:fs'
import { globbyStream } from 'globby'
import { File } from './File.js'
import { Options } from './types.js'

/**
 * Asynchronously expands glob patterns for iterative file and text processing.
 */
export async function* readGlob(
  patterns: string | readonly string[],
  options?: BufferEncoding | Options
): AsyncGenerator<File> {
  const {
    encoding,
    cwd = process.cwd(),
    ignore = [],
    dry = false
  } = typeof options === 'string' ? { encoding: options } : options || {}
  const paths = globbyStream(patterns, {
    cwd,
    ignore,
    onlyFiles: true
  })

  for await (const filepath of paths) {
    const [value = '', stat = {}] = dry
      ? []
      : await Promise.all([
          fsp.readFile(join(cwd, String(filepath)), encoding),
          fsp.stat(join(cwd, String(filepath)))
        ])

    yield new File({ cwd, path: String(filepath), value, data: { stat }, dry })
  }
}
