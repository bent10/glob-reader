import { normalize } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { constants, accessSync, readFileSync, promises as fsp } from 'node:fs'
import test, { ThrowsExpectation } from 'ava'
import { transform, transformSync } from '@swc/core'
import { File } from '../dist/index.js'
import { cleanStack, tsCodeMock } from './utils.js'

test.after.always('cleanup', async () => {
  // await fsp.unlink('./test/.cache')
})

test('allow missing options', async t => {
  const file = new File()

  t.deepEqual(file.history, [])
  t.deepEqual(file.data, { matter: {} })
  t.deepEqual(file.messages, [])
  t.is(<unknown>file.value, undefined)
  t.is(<unknown>file.path, undefined)
  t.is(file.cwd, process.cwd())
  t.is(file.dirname, undefined)
  t.is(file.basename, undefined)
  t.is(file.stem, undefined)
  t.is(file.extname, undefined)
  t.is(file.dry, false)
  t.is(file.bytes, 0)
  t.is(file.size, '0B')

  t.notThrows(() => file.message(''))

  // throws
  const typeError: ThrowsExpectation = {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be/
  }
  await t.throwsAsync(file.write(), typeError)
  await t.throwsAsync(file.delete(), typeError)
  t.throws(() => file.writeSync(), typeError)
  t.throws(() => file.deleteSync(), typeError)
})

test('string options', t => {
  const file = new File('foo\nbar\nbaz')

  t.is(file.value, 'foo\nbar\nbaz')
  t.is(file.bytes, 11)
  t.is(file.size, '11B')
})

test('url options', t => {
  const url = new URL(import.meta.url)
  const file = new File(url)

  t.is(file.path, fileURLToPath(url))
})

test('object options', t => {
  const file = new File({ basename: 'foo.md', value: '#foo\nbar baz' })

  t.deepEqual(file.history, ['foo.md'])
  t.is(file.value, '#foo\nbar baz')
  t.is(file.path, 'foo.md')
  t.is(file.dirname, '.')
  t.is(file.basename, 'foo.md')
  t.is(file.stem, 'foo')
  t.is(file.extname, '.md')
})

test('file options', t => {
  const left = new File({ path: 'left.md', value: '#foo\nbar baz' })
  const right = new File(left)

  t.deepEqual(left, right)
  t.is(left.path, right.path)
  t.is(left.value, right.value)
})

test('custom props', t => {
  const page = { slug: 'foo', title: 'Foo', tags: ['foo', 'bar'] }
  const file = new File({ anyProps: 'value', data: { page } })

  t.deepEqual(file.data, { matter: {}, page })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - custom props are not defined in the interface, use `data` for custom fields instead
  t.is(file.anyProps, 'value')
})

test('can not set data.matter directly', t => {
  const matter = { slug: 'foo', title: 'Foo', tags: ['foo', 'bar'] }
  const file = new File({ data: { matter } })

  t.notDeepEqual(file.data, { matter })
  t.deepEqual(file.data, { matter: {} })
})

test('toString()', t => {
  t.is(new File().toString(), '')
  t.is(new File(Buffer.from('foo')).toString(), 'foo')
  t.is(new File(Buffer.from('foo')).toString('hex'), '666f6f')
})

test('is()', t => {
  const file = new File({ path: 'path/to/foo.md', value: '#foo\nbar baz' })

  t.true(file.is(null)) // nothing to test
  t.true(file.is('.md'))
  t.true(file.is('**/*.md'))
  t.true(file.is('**/*.{js,md}'))
  t.false(file.is('**/*.js'))
  t.false(file.is('**/*.{js,mdx}'))

  t.true(file.is({ stem: 'foo' }))
  t.false(file.is({ stem: 'bar' }))

  t.false(file.is({ missing: true }))
  t.true(file.is({ missing: false }))

  t.true(file.is({ stem: { prefix: 'f' } }))
  t.true(file.is({ stem: { suffix: 'oo' } }))
})

test('rename()', t => {
  const file = new File({ path: 'src/foo.md' })

  file.rename({ extname: '.html', dirname: 'dist' })

  t.is(file.path, normalize('dist/foo.html'))
})

test('reporter()', t => {
  const file = new File({ path: 'test/.cache/foo.js' })

  file.info('some message')
  file.message('some warning!', { line: 2, column: 4 })

  t.regex(
    file.reporter({ color: false }),
    /test\/.cache\/foo.js\n  1:1  info     some message\n  2:4  warning  some warning\!/
  )
})

test('handle fail()', async t => {
  const file = new File({ path: 'test/.cache/foo.js' })

  try {
    file.fail(new ReferenceError('foo is not defined'))
  } catch {}

  t.is(
    cleanStack(file.reporter({ color: false }), 3),
    `test/.cache/foo.js
  1:1  error  ReferenceError: foo is not defined
    at File.test.ts:1:1`
  )
})

test.serial('write()', async t => {
  const file = new File('foo\nbar\nbaz')
  file.path = './test/.cache/foo.md'
  await file.write()

  await t.notThrowsAsync(fsp.access(file.path, constants.F_OK))

  // should error if no path is provided
  await t.throwsAsync(new File().write(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('delete()', async t => {
  const file = new File({ path: './test/.cache/foo.md' })
  await file.delete()

  await t.throwsAsync(fsp.access(file.path, constants.F_OK), {
    instanceOf: Error,
    code: 'ENOENT',
    message: /ENOENT: no such file or directory, access/
  })

  // should error if no path is provided
  await t.throwsAsync(new File().delete(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('writeSync()', t => {
  const file = new File('foo\nbar\nbaz')
  file.path = './test/.cache/bar.md'
  file.writeSync()

  t.notThrows(() => accessSync(file.path, constants.F_OK))

  // should error if no path is provided
  t.throws(() => new File().writeSync(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('deleteSync()', t => {
  const file = new File({ path: './test/.cache/bar.md' })
  file.deleteSync()

  t.throws(() => accessSync(file.path, constants.F_OK), {
    instanceOf: Error,
    code: 'ENOENT',
    message: "ENOENT: no such file or directory, access './test/.cache/bar.md'"
  })

  // should error if no path is provided
  t.throws(() => new File().deleteSync(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('write() with .map and .min', async t => {
  const file = new File({
    path: './test/.cache/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = await transform(file.toString(), {
    sourceMaps: true,
    filename: file.basename,
    jsc: {
      parser: {
        syntax: 'typescript'
      }
    }
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map!)

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
    map: JSON.parse(minified.map!)
  }

  await file.write()

  await t.notThrowsAsync(fsp.access('./test/.cache/baz.js', constants.F_OK))
  await t.notThrowsAsync(fsp.access('./test/.cache/baz.js.map', constants.F_OK))
  await t.notThrowsAsync(fsp.access('./test/.cache/baz.min.js', constants.F_OK))
  await t.notThrowsAsync(
    fsp.access('./test/.cache/baz.min.js.map', constants.F_OK)
  )

  t.is(file.value, await fsp.readFile(file.path, 'utf8'))
  t.is(
    JSON.stringify(file.map),
    await fsp.readFile('./test/.cache/baz.js.map', 'utf8')
  )
  t.is(file.min.code, await fsp.readFile('./test/.cache/baz.min.js', 'utf8'))
  t.is(
    JSON.stringify(file.min.map),
    await fsp.readFile('./test/.cache/baz.min.js.map', 'utf8')
  )
})

test.serial('delete() with .map and .min', async t => {
  const file = new File({
    path: './test/.cache/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = await transform(file.toString(), {
    sourceMaps: true,
    filename: file.basename,
    jsc: {
      parser: {
        syntax: 'typescript'
      }
    }
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map!)

  file.rename({ extname: '.js' })
  const minified = await transform(code, {
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
    map: JSON.parse(minified.map!)
  }

  await file.delete()

  const expectend = {
    instanceOf: Error,
    code: 'ENOENT',
    message: /ENOENT: no such file or directory, access/
  }
  await t.throwsAsync(
    fsp.access('./test/.cache/baz.js', constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fsp.access('./test/.cache/baz.js.map', constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fsp.access('./test/.cache/baz.min.js', constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fsp.access('./test/.cache/baz.min.js.map', constants.F_OK),
    expectend
  )
})

test.serial('writeSync() with .map and .min', t => {
  const file = new File({
    path: './test/.cache/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = transformSync(file.toString(), {
    sourceMaps: true,
    filename: file.basename,
    jsc: {
      parser: {
        syntax: 'typescript'
      }
    }
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map!)

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
    map: JSON.parse(minified.map!)
  }

  file.writeSync()

  t.notThrows(() => fsp.access('./test/.cache/baz.js', constants.F_OK))
  t.notThrows(() => fsp.access('./test/.cache/baz.js.map', constants.F_OK))
  t.notThrows(() => fsp.access('./test/.cache/baz.min.js', constants.F_OK))
  t.notThrows(() => fsp.access('./test/.cache/baz.min.js.map', constants.F_OK))

  t.is(file.value, readFileSync(file.path, 'utf8'))
  t.is(
    JSON.stringify(file.map),
    readFileSync('./test/.cache/baz.js.map', 'utf8')
  )
  t.is(file.min.code, readFileSync('./test/.cache/baz.min.js', 'utf8'))
  t.is(
    JSON.stringify(file.min.map),
    readFileSync('./test/.cache/baz.min.js.map', 'utf8')
  )
})

test.serial('deleteSync() with .map and .min', t => {
  const file = new File({
    path: './test/.cache/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = transformSync(file.toString(), {
    sourceMaps: true,
    filename: file.basename,
    jsc: {
      parser: {
        syntax: 'typescript'
      }
    }
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map!)

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
    map: JSON.parse(minified.map!)
  }

  file.deleteSync()

  const expectend: ThrowsExpectation = {
    instanceOf: Error,
    code: 'ENOENT',
    message: /ENOENT: no such file or directory, access/
  }
  t.throws(() => accessSync('./test/.cache/baz.js', constants.F_OK), expectend)
  t.throws(
    () => accessSync('./test/.cache/baz.js.map', constants.F_OK),
    expectend
  )
  t.throws(
    () => accessSync('./test/.cache/baz.min.js', constants.F_OK),
    expectend
  )
  t.throws(
    () => accessSync('./test/.cache/baz.min.js.map', constants.F_OK),
    expectend
  )
})

test('dry run', async t => {
  const file = new File({
    basename: 'foo.md',
    value: '#foo\nbar baz',
    dry: true
  })

  t.true(file.dry)
  t.is(await file.write(), undefined)
  t.is(await file.delete(), undefined)
  t.is(file.writeSync(), undefined)
  t.is(file.deleteSync(), undefined)
})
