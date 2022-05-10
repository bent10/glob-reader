/// <reference types="node" />
import { File } from './File.js';
import { Options } from './types.js';
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
export declare function readGlobSync(patterns: string | readonly string[], options?: BufferEncoding | Options): Generator<File>;
