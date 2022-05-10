import path from 'node:path'

export const tsCodeMock = `interface Foobar {
  foo: number;
  bar: {
    baz: boolean;
    qux: string;
  };
}

type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

const foobar: DeepPartial<Foobar> = {
  foo: 1,
  bar: { baz: true }
};`

/**
 * Human readable byte length of file.
 */
export function size(bytes: number): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let i = 0

  while (bytes >= 1024) {
    bytes /= 1024
    i++
  }

  return bytes.toFixed(i === 0 ? 0 : 1) + units[i]
}

/**
 * @param {string|undefined} stack
 * @param {number} max
 */
export function cleanStack(stack: string, max: number) {
  return (stack || '')
    .replace(new RegExp('\\(.+\\' + path.sep, 'g'), '(')
    .replace(/file:.+\//g, '')
    .replace(/\d+:\d+/g, '1:1')
    .split('\n')
    .slice(0, max)
    .join('\n')
}

export async function fromAsync<T>(asyncIterable: AsyncIterable<T>) {
  const arr: T[] = []
  const iter = asyncIterable[Symbol.asyncIterator]()
  let result = await iter.next()

  while (!result.done) {
    arr.push(result.value)
    result = await iter.next()
  }

  return arr
}
