import { join } from 'node:path'
import { promises as fsp, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'
import { is } from 'vfile-is'
import { rename } from 'vfile-rename'
import { reporter } from 'vfile-reporter'
import type {
  Check,
  FileCompatible,
  RawSourceMap,
  Renames,
  ReporterOptions
} from './types.js'

/**
 * Virtual file class.
 */
export class File extends VFile {
  /**
   * Status of dry run. If `true`, the file won't be written or deleted
   * when calling `write|writeSync` or `delete|deleteSync` methods.
   *
   * @default false
   */
  dry = false

  /**
   * Sometimes files have a minified version, it can be stored in the
   * `min` field.
   */
  min?: {
    code?: string
    map?: RawSourceMap
  }

  /**
   * Creates a new file instance.
   *
   * ```js
   * const file = new File('foo.md')
   *
   * file.path // => 'foo.md'
   * file.is('.md') // => true
   * file.data.matter // => {...}
   * ```
   */
  constructor(options?: FileCompatible | File) {
    super(options)
    let stripMatter = false

    if (
      typeof options === 'string' ||
      Buffer.isBuffer(options) ||
      options instanceof URL
    ) {
      // done in super()
    } else if (typeof options === 'object') {
      this.dry = !!options.dry

      if (!(options instanceof File)) {
        stripMatter = !!options.stripMatter
      }
    }

    // strip frontmatter from file
    matter(this, { strip: stripMatter })
  }

  /**
   * The byte length of file.
   */
  get bytes(): number {
    return this.dry ? 0 : Buffer.byteLength(this.value || '', 'utf8')
  }

  /**
   * Human readable byte length of file.
   */
  get size(): string {
    if (this.dry) return '0B'

    const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let bytes = this.bytes
    let i = 0

    while (bytes >= 1024) {
      bytes /= 1024
      i++
    }

    return bytes.toFixed(i === 0 ? 0 : 1) + units[i]
  }

  /**
   * Tests if file passes the given `check`.
   *
   * ```js
   * // file.path = 'src/foo.md'
   * file.is('.md') // => true
   * file.is('*.md') // => false
   * file.is('**\/*.md') // => true
   * file.is('**\/*.{md,html}') // => true
   * file.is('**\/*.{mdx,jsx}') // => false
   *
   * file.is({stem: 'foo'}) // => true
   * file.is({ stem: { suffix: 'oo' } }) // => true
   * file.is({stem: 'bar'}) // => false
   * ```
   */
  is(check: Check): boolean {
    return is(this, check)
  }

  /**
   * Renames and mutates the file internally.
   *
   * ```js
   * file.path = 'src/foo.md'
   *
   * file.rename({ extname: '.html', dirname: 'dist' })
   * file.path // => 'dist/foo.html'
   * ```
   */
  rename(renames: Renames): void {
    rename(this, renames)
  }

  /**
   * Returns diagnostic information about the file.
   *
   * ```js
   * file.info('some message')
   * file.message('some warning!', {line: 2, column: 4})
   *
   * file.reporter()
   * // src/foo.js
   * //   1:1  info     some message
   * //   2:4  warning  some warning!
   * //
   * // 2 messages (⚠ 1 warning)
   * ```
   */
  reporter(reporterOptions?: ReporterOptions): string {
    return reporter(this, reporterOptions)
  }

  /**
   * Writes file to disk asynchronously.
   */
  async write(): Promise<void> {
    if (this.dry) return

    try {
      await Promise.all([
        // creates directory if it doesn't exist
        this.dirname &&
          fsp.mkdir(join(this.cwd, this.dirname), { recursive: true }),
        fsp.writeFile(join(this.cwd, this.path), this.toString()),
        this.#writeMap(),
        this.#writeMin()
      ])

      // mark as stored
      this.stored = true
    } catch (error) {
      throw error
    }
  }

  /**
   * Writes file to disk synchronously.
   */
  writeSync(): void {
    if (this.dry) return

    try {
      // creates directory if it doesn't exist
      this.dirname &&
        mkdirSync(join(this.cwd, this.dirname), { recursive: true })

      writeFileSync(join(this.cwd, this.path), this.toString())
      this.#writeMapSync()
      this.#writeMinSync()

      // mark as stored
      this.stored = true
    } catch (error) {
      throw error
    }
  }

  /**
   * Deletes file from disk asynchronously.
   */
  async delete(): Promise<void> {
    if (this.dry) return

    try {
      await Promise.all([
        fsp.unlink(join(this.cwd, this.path)),
        this.#deleteMap(),
        this.#deleteMin()
      ])

      // mark as un-stored
      this.stored = false
    } catch (error) {
      throw error
    }
  }

  /**
   * Deletes file from disk synchronously.
   */
  deleteSync(): void {
    if (this.dry) return

    try {
      unlinkSync(join(this.cwd, this.path))
      this.#deleteMapSync()
      this.#deleteMinSync()

      // mark as un-stored
      this.stored = false
    } catch (error) {
      throw error
    }
  }

  /**
   * If file has `map` field, writes `.map` file to disk asynchronously.
   */
  async #writeMap(): Promise<void> {
    if (!this.map) return

    await fsp.writeFile(
      join(this.cwd, `${this.path}.map`),
      JSON.stringify(this.map)
    )
  }

  /**
   * If file has `map` field, writes `.map` file to disk synchronously.
   */
  #writeMapSync(): void {
    if (!this.map) return

    writeFileSync(join(this.cwd, `${this.path}.map`), JSON.stringify(this.map))
  }

  /**
   * If file has `map` field, deletes `.map` file from disk asynchronously.
   */
  async #deleteMap(): Promise<void> {
    if (!this.map) return

    await fsp.unlink(join(this.cwd, `${this.path}.map`))
  }

  /**
   * If file has `map` field, deletes `.map` file from disk synchronously.
   */
  #deleteMapSync(): void {
    if (!this.map) return

    unlinkSync(join(this.cwd, `${this.path}.map`))
  }

  /**
   * Writes minified file to disk asynchronously.
   */
  async #writeMin(): Promise<void> {
    if (!this.min) return

    this.min.code &&
      (await fsp.writeFile(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        join(this.cwd, this.dirname!, `${this.stem}.min${this.extname}`),
        this.min.code
      ))

    this.min.map &&
      (await fsp.writeFile(
        join(
          this.cwd,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.dirname!,
          `${this.stem}.min${this.extname}.map`
        ),
        JSON.stringify(this.min.map)
      ))
  }

  /**
   * Writes minified file to disk synchronously.
   */
  #writeMinSync(): void {
    if (!this.min) return

    this.min.code &&
      writeFileSync(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        join(this.cwd, this.dirname!, `${this.stem}.min${this.extname}`),
        this.min.code
      )

    this.min.map &&
      writeFileSync(
        join(
          this.cwd,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.dirname!,
          `${this.stem}.min${this.extname}.map`
        ),
        JSON.stringify(this.min.map)
      )
  }

  /**
   * Deletes minified file from disk asynchronously.
   */
  async #deleteMin(): Promise<void> {
    if (!this.min) return

    this.min.code &&
      (await fsp.unlink(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        join(this.cwd, this.dirname!, `${this.stem}.min${this.extname}`)
      ))

    this.min.map &&
      (await fsp.unlink(
        join(
          this.cwd,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.dirname!,
          `${this.stem}.min${this.extname}.map`
        )
      ))
  }

  /**
   * Deletes minified file from disk synchronously.
   */
  #deleteMinSync(): void {
    if (!this.min) return

    this.min.code &&
      unlinkSync(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        join(this.cwd, this.dirname!, `${this.stem}.min${this.extname}`)
      )
    this.min.map &&
      unlinkSync(
        join(
          this.cwd,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.dirname!,
          `${this.stem}.min${this.extname}.map`
        )
      )
  }
}
