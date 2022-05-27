import type { Buffer } from 'node:buffer'

export interface Options {
  /**
   * Base of path.
   *
   * @default process.cwd()
   */
  cwd?: string

  /**
   * Specifies the maximum number of concurrent requests from a reader to read directories.
   *
   * > The higher the number, the higher the performance and load on the file system.
   * > If you want to read in quiet mode, set the value to a comfortable number or 1.
   *
   * @default os.cpu().length
   */
  concurrency?: number

  /**
   * Enables a [case-sensitive](https://en.wikipedia.org/wiki/Case_sensitivity) mode for matching files.
   *
   * @default true
   */
  caseSensitiveMatch?: boolean

  /**
   * An array of glob patterns to exclude matches.
   *
   * @default []
   */
  ignore?: string[]

  /**
   * The buffer encoding to use when reading files.
   *
   * @default Buffer
   */
  encoding?: BufferEncoding

  /**
   * If `true`, the file will provides information about the [`fs.Stats`](https://nodejs.org/api/fs.html#class-fsstats).
   *
   * > **Note:** this option is ignored on dry mode.
   *
   * @default false
   */
  fsStats?: boolean

  /**
   * If `true`, it will not read the file contents and stat.
   *
   * @default false
   */
  dry?: boolean
}

/**
 * Compatible value types for the `File` constructor.
 */
export type FileValue = string | Buffer

/**
 * `File.data` interface.
 */
export interface FileData {
  [key: string]: unknown
}

/**
 * Options for the `File` constructor.
 */
export interface FileOptions {
  value?: FileValue
  cwd?: string
  history?: string[]
  path?: string | URL
  basename?: string
  stem?: string
  extname?: string
  dirname?: string
  data?: FileData
  dry?: boolean
  [key: string]: unknown
}

/**
 * Arguments that can be passed to the `File` constructor.
 */
export type FileCompatible = FileValue | FileOptions | URL

/**
 * Options for the `File#reporter`.
 */
export type ReporterOptions = {
  /**
   * Label to use for file without file-path. If no file-path and no `defaultName`
   * is given, `no name` will show up in the report.
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

// external types
export type { Check } from 'vfile-is'
export type { Renames } from 'vfile-rename'
export type { RawSourceMap } from 'source-map-js'
