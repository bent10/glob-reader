import { normalize, dirname, basename, extname, join } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { constants, accessSync, readFileSync, promises as fsp } from 'node:fs'
import { transform, transformSync } from '@swc/core'
import { File } from '../src/index.js'
import { cleanStack, tsCodeMock } from './utils.js'

describe('File options', () => {
  it('allows undefined', async () => {
    const file = new File()

    expect(file.cwd).toBe(process.cwd())
    expect(file.data).toHaveProperty('matter')
    expect(file.data.matter).toEqual({})
    expect(file.dry).toBe(false)
    expect(file.history).toEqual([])
    expect(file.messages).toEqual([])
    expect(file.path).toBeUndefined()
    expect(file.dirname).toBeUndefined()
    expect(file.basename).toBeUndefined()
    expect(file.stem).toBeUndefined()
    expect(file.extname).toBeUndefined()
    expect(file.value).toBeUndefined()
    expect(file.bytes).toBe(0)
    expect(file.size).toBe('0B')

    expect(() => file.message('')).not.toThrow()
    const errMsg = /The "path" argument must be of type string/
    // => TypeError: The "path" argument must be of type string. Received undefined
    await expect(file.write()).rejects.toThrow(errMsg)
    await expect(file.delete()).rejects.toThrow(errMsg)
    expect(() => file.writeSync()).toThrow(errMsg)
    expect(() => file.deleteSync()).toThrow(errMsg)
  })

  it('allows string', () => {
    const file = new File('foo\nbar\nbaz')

    expect(file.cwd).toBe(process.cwd())
    expect(file.data).toHaveProperty('matter')
    expect(file.data.matter).toEqual({})
    expect(file.dry).toBe(false)
    expect(file.history).toEqual([])
    expect(file.messages).toEqual([])
    expect(file.path).toBeUndefined()
    expect(file.dirname).toBeUndefined()
    expect(file.basename).toBeUndefined()
    expect(file.stem).toBeUndefined()
    expect(file.extname).toBeUndefined()
    expect(file.value).toBe('foo\nbar\nbaz')
    expect(file.bytes).toBe(11)
    expect(file.size).toBe('11B')
  })

  it('allows URL', () => {
    const url = new URL(import.meta.url)
    const file = new File(url)
    const filePath = fileURLToPath(url)

    expect(file.cwd).toBe(process.cwd())
    expect(file.data).toHaveProperty('matter')
    expect(file.data.matter).toEqual({})
    expect(file.dry).toBe(false)
    expect(file.history).toEqual([filePath])
    expect(file.messages).toEqual([])
    expect(file.path).toBe(filePath)
    expect(file.dirname).toBe(dirname(filePath))
    expect(file.basename).toBe(basename(filePath))
    expect(file.stem).toBe(basename(filePath, extname(filePath)))
    expect(file.extname).toBe(extname(filePath))
    expect(file.value).toBeUndefined()
  })

  it('allows object', () => {
    const file = new File({ basename: 'foo.md', value: '#foo\nbar baz' })

    expect(file.history).toEqual(['foo.md'])
    expect(file.value).toBe('#foo\nbar baz')
    expect(file.path).toBe('foo.md')
    expect(file.dirname).toBe('.')
    expect(file.basename).toBe('foo.md')
    expect(file.stem).toBe('foo')
    expect(file.extname).toBe('.md')
  })

  it('allows instanceof File', () => {
    const left = new File({ path: 'left.md', value: '#foo\nbar baz' })
    const right = new File(left)

    expect(left).toEqual(right)
    expect(left.path).toBe(right.path)
    expect(left.value).toBe(right.value)
  })
})

describe('File', () => {
  it('allows dry run', async () => {
    const file = new File({
      basename: 'foo.md',
      value: '#foo\nbar baz',
      dry: true
    })

    expect(file.dry).toBe(true)
    expect(await file.write()).toBeUndefined()
    expect(await file.delete()).toBeUndefined()
    expect(file.writeSync()).toBeUndefined()
    expect(file.deleteSync()).toBeUndefined()
  })

  it('allows custom props', () => {
    const page = { slug: 'foo', title: 'Foo', tags: ['foo', 'bar'] }
    const file = new File({ anyProps: 'value', data: { page } })

    expect(file.data).toEqual({ matter: {}, page })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - custom props are not defined in the interface, use `data` for custom fields instead
    expect(file.anyProps).toBe('value')
  })

  it('cannot set `data.matter` directly', () => {
    const matter = { slug: 'foo', title: 'Foo', tags: ['foo', 'bar'] }
    const file = new File({ data: { matter } })

    expect(file.data).not.toEqual({ matter })
    expect(file.data).toEqual({ matter: {} })
  })

  it('#toString()', () => {
    expect(new File().toString()).toBe('')
    expect(new File(Buffer.from('foo')).toString()).toBe('foo')
    expect(new File(Buffer.from('foo')).toString('utf8')).toBe('foo')
  })

  it('#is()', () => {
    const file = new File({ path: 'path/to/foo.md', value: '#foo\nbar baz' })

    expect(file.is(null)).toBe(true) // nothing to test
    expect(file.is('.md')).toBe(true)
    expect(file.is('**/*.md')).toBe(true)
    expect(file.is('**/*.{js,md}')).toBe(true)
    expect(file.is('**/*.js')).toBe(false)
    expect(file.is('**/*.{js,mdx}')).toBe(false)

    expect(file.is({ stem: 'foo' })).toBe(true)
    expect(file.is({ stem: 'bar' })).toBe(false)

    expect(file.is({ missing: true })).toBe(false)
    expect(file.is({ missing: false })).toBe(true)

    expect(file.is({ stem: { prefix: 'f' } })).toBe(true)
    expect(file.is({ stem: { suffix: 'oo' } })).toBe(true)
  })

  it('#rename()', () => {
    const file = new File({ path: 'src/foo.md' })

    file.rename({ extname: '.html', dirname: 'dist' })

    expect(file.path).toBe(normalize('dist/foo.html'))
  })

  it('#reporter()', () => {
    const file = new File({ path: 'test/fixtures/foo.js' })

    file.info('some message')
    file.message('some warning!', { line: 2, column: 4 })

    expect(file.reporter({ color: false })).toMatchInlineSnapshot(`
      "test/fixtures/foo.js
          info    some message
      2:4 warning some warning!

      2 messages (⚠ 1 warning)"
    `)
  })

  it('#fail()', async () => {
    const file = new File({ path: 'test/fixtures/foo.js' })

    try {
      file.fail(new ReferenceError('foo is not defined'))
    } catch {}

    expect(cleanStack(file.reporter({ color: false }), 2))
      .toBe(`test/fixtures/foo.js
 error ReferenceError: foo is not defined`)
  })
})

describe('File writes', () => {
  it('async', async () => {
    const file = new File({
      path: './test/fixtures/foo.md',
      value: 'foo\nbar\nbaz'
    })

    // write './test/fixtures/foo.md' file to disk
    await file.write()
    // make sure the file is created
    await expect(fsp.access(file.path, constants.F_OK)).resolves.not.toThrow()

    // should throws an error if no path is provided
    // => TypeError: The "path" argument must be of type string. Received undefined
    await expect(new File().write()).rejects.toThrow(
      /The "path" argument must be of type string/
    )
  })

  it('async with .map and .min', async () => {
    const file = new File({
      path: './test/fixtures/bar.ts',
      value: tsCodeMock
    })

    const { code, map = '' } = await transform(file.toString(), {
      sourceMaps: true,
      filename: file.basename,
      jsc: {
        parser: {
          syntax: 'typescript'
        }
      }
    })

    file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
    file.map = JSON.parse(map)

    file.rename({ extname: '.js' })
    const minified = await transform(code, {
      minify: true,
      sourceMaps: true,
      filename: file.basename,
      jsc: {
        parser: {
          syntax: 'ecmascript'
        }
      }
    })
    file.min = {
      code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
      map: JSON.parse(minified.map || '')
    }

    // write 'bar.js', 'bar.js.map', 'bar.min.js', 'bar.min.js.map' to './test/fixtures'
    await file.write()
    // make sure all files are written
    const destDir = file.dirname || ''
    await expect(fsp.access(file.path, constants.F_OK)).resolves.not.toThrow()
    await expect(
      fsp.access(join(destDir, 'bar.js.map'), constants.F_OK)
    ).resolves.not.toThrow()
    await expect(
      fsp.access(join(destDir, 'bar.min.js'), constants.F_OK)
    ).resolves.not.toThrow()
    await expect(
      fsp.access(join(destDir, 'bar.min.js.map'), constants.F_OK)
    ).resolves.not.toThrow()

    expect(file.value).toBe(await fsp.readFile(file.path, 'utf8'))
    expect(JSON.stringify(file.map)).toBe(
      await fsp.readFile(join(destDir, 'bar.js.map'), 'utf8')
    )
    expect(file.min.code).toBe(
      await fsp.readFile(join(destDir, 'bar.min.js'), 'utf8')
    )
    expect(JSON.stringify(file.min.map)).toBe(
      await fsp.readFile(join(destDir, 'bar.min.js.map'), 'utf8')
    )
  })

  it('sync', () => {
    const file = new File({
      path: './test/fixtures/baz.md',
      value: 'foo\nbar\nbaz'
    })

    // write './test/fixtures/bar.md' file to disk
    file.writeSync()
    // make sure the file is created
    expect(() => accessSync(file.path, constants.F_OK)).not.toThrow()

    // should throws an error if no path is provided
    // => TypeError: The "path" argument must be of type string. Received undefined
    expect(() => new File().writeSync()).toThrow(
      /The "path" argument must be of type string/
    )
  })

  it('sync with .map and .min', () => {
    const file = new File({
      path: './test/fixtures/qux.ts',
      value: tsCodeMock
    })

    const { code, map = '' } = transformSync(file.toString(), {
      sourceMaps: true,
      filename: file.basename,
      jsc: {
        parser: {
          syntax: 'typescript'
        }
      }
    })

    file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
    file.map = JSON.parse(map)

    file.rename({ extname: '.js' })
    const minified = transformSync(code, {
      minify: true,
      sourceMaps: true,
      filename: file.basename,
      jsc: {
        parser: {
          syntax: 'typescript'
        }
      }
    })
    file.min = {
      code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
      map: JSON.parse(minified.map || '')
    }

    // write 'qux.js', 'qux.js.map', 'qux.min.js', 'qux.min.js.map' to './test/fixtures'
    file.writeSync()
    // make sure all files are written
    const destDir = file.dirname || ''
    expect(() => fsp.access(file.path, constants.F_OK)).not.toThrow()
    expect(() =>
      fsp.access(join(destDir, 'qux.js.map'), constants.F_OK)
    ).not.toThrow()
    expect(() =>
      fsp.access(join(destDir, 'qux.min.js'), constants.F_OK)
    ).not.toThrow()
    expect(() =>
      fsp.access(join(destDir, 'qux.min.js.map'), constants.F_OK)
    ).not.toThrow()

    expect(file.value).toBe(readFileSync(file.path, 'utf8'))
    expect(JSON.stringify(file.map)).toBe(
      readFileSync(join(destDir, 'qux.js.map'), 'utf8')
    )
    expect(file.min.code).toBe(
      readFileSync(join(destDir, 'qux.min.js'), 'utf8')
    )
    expect(JSON.stringify(file.min.map)).toBe(
      readFileSync(join(destDir, 'qux.min.js.map'), 'utf8')
    )
  })
})

describe('File deletes', () => {
  it('async', async () => {
    const file = new File({ path: './test/fixtures/foo.md' })

    // deletes './test/fixtures/foo.md' file from disk
    await file.delete()
    // makes sure './test/fixtures/foo.md' file is deleted
    await expect(fsp.access(file.path, constants.F_OK)).rejects.toThrow(
      /ENOENT: no such file or directory, access/
    )

    // should throws an error if no path is provided
    // TypeError: The "path" argument must be of type string. Received undefined
    await expect(new File().delete()).rejects.toThrow(
      /The "path" argument must be of type string/
    )
  })

  it('async with .map and .min', async () => {
    const file = new File({
      path: './test/fixtures/bar.ts',
      value: tsCodeMock
    })

    file.value = `\n//# sourceMappingURL=${file.path}.map\n`
    file.map = { version: 3, sources: [], names: [], mappings: '', file: '' }

    file.rename({ extname: '.js' })
    file.min = {
      code: `\n//# sourceMappingURL=${file.path}.map\n`,
      map: { version: '3', sources: [], names: [], mappings: '' }
    }

    // deletes 'bar.js', 'bar.js.map', 'bar.min.js', 'bar.min.js.map' from './test/fixtures'
    await file.delete()
    // make sure all files are deleted
    const destDir = file.dirname || ''
    await expect(fsp.access(file.path, constants.F_OK)).rejects.toThrow(
      /ENOENT: no such file or directory, access/
    )
    await expect(
      fsp.access(join(destDir, 'baz.js.map'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
    await expect(
      fsp.access(join(destDir, 'baz.min.js'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
    await expect(
      fsp.access(join(destDir, 'baz.min.js.map'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
  })

  it('sync', () => {
    const file = new File({ path: './test/fixtures/baz.md' })

    // deletes './test/fixtures/baz.md' file from disk
    file.deleteSync()
    // makes sure './test/fixtures/baz.md' file is deleted
    expect(() => accessSync(file.path, constants.F_OK)).toThrowError(
      /ENOENT: no such file or directory, access/
    )

    // should throws an error if no path is provided
    // TypeError: The "path" argument must be of type string. Received undefined
    expect(() => new File().deleteSync()).toThrowError(
      /The "path" argument must be of type string/
    )
  })

  it('sync with .map and .min', () => {
    const file = new File({
      path: './test/fixtures/qux.ts',
      value: tsCodeMock
    })

    file.value = `\n//# sourceMappingURL=${file.path}.map\n`
    file.map = { version: 3, sources: [], names: [], mappings: '', file: '' }

    file.rename({ extname: '.js' })
    file.min = {
      code: `\n//# sourceMappingURL=${file.path}.map\n`,
      map: { version: '3', sources: [], names: [], mappings: '' }
    }

    // deletes 'qux.js', 'qux.js.map', 'qux.min.js', 'qux.min.js.map' from './test/fixtures'
    file.deleteSync()
    // make sure all files are deleted
    const destDir = file.dirname || ''
    expect(fsp.access(file.path, constants.F_OK)).rejects.toThrow(
      /ENOENT: no such file or directory, access/
    )
    expect(
      fsp.access(join(destDir, 'baz.js.map'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
    expect(
      fsp.access(join(destDir, 'baz.min.js'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
    expect(
      fsp.access(join(destDir, 'baz.min.js.map'), constants.F_OK)
    ).rejects.toThrow(/ENOENT: no such file or directory, access/)
  })
})
