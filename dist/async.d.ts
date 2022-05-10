/// <reference types="node" />
import { File } from './File.js';
import { Options } from './types.js';
/**
 * Asynchronously expands glob patterns for iterative file and text processing.
 */
export declare function readGlob(patterns: string | readonly string[], options?: BufferEncoding | Options): AsyncGenerator<File>;
