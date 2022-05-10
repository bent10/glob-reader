import { VFile } from 'vfile';
import type { Check, FileCompatible, RawSourceMap, Renames, ReporterOptions } from './types.js';
/**
 * Virtual file class.
 */
export declare class File extends VFile {
    #private;
    /**
     * Status of dry run. If `true`, the file won't be written or deleted
     * when calling `write|writeSync` or `delete|deleteSync` methods.
     *
     * @default false
     */
    dry: boolean;
    /**
     * Sometimes files have a minified version, it can be stored in the
     * `min` field.
     */
    min?: {
        code?: string;
        map?: RawSourceMap;
    };
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
    constructor(options?: FileCompatible | File);
    /**
     * The byte length of file.
     */
    get bytes(): number;
    /**
     * Human readable byte length of file.
     */
    get size(): string;
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
    is(check: Check): boolean;
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
    rename(renames: Renames): void;
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
    reporter(reporterOptions?: ReporterOptions): string;
    /**
     * Writes file to disk asynchronously.
     */
    write(): Promise<void>;
    /**
     * Writes file to disk synchronously.
     */
    writeSync(): void;
    /**
     * Deletes file from disk asynchronously.
     */
    delete(): Promise<void>;
    /**
     * Deletes file from disk synchronously.
     */
    deleteSync(): void;
}
