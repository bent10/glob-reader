import { URL, fileURLToPath } from 'node:url'
import fse from 'fs-extra'
import test, { ThrowsExpectation } from 'ava'
import { transform, transformSync } from 'esbuild'
import { File } from '../dist/index.js'
import { cleanStack, tsCodeMock } from './utils.js'

test.after.always('cleanup', async () => {
  await fse.remove('./test/fixture')
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

  t.is(file.path, 'dist/foo.html')
})

test('reporter()', t => {
  const file = new File({ path: 'test/fixture/foo.js' })

  file.info('some message')
  file.message('some warning!', { line: 2, column: 4 })

  t.is(
    file.reporter({ color: false }),
    `test/fixture/foo.js
  1:1  info     some message
  2:4  warning  some warning!

2 messages (⚠ 1 warning)`
  )
})

test('handle fail()', async t => {
  const file = new File({ path: 'test/fixture/foo.js' })

  try {
    file.fail(new ReferenceError('foo is not defined'))
  } catch {}

  t.is(
    cleanStack(file.reporter({ color: false }), 3),
    `test/fixture/foo.js
  1:1  error  ReferenceError: foo is not defined
    at File.test.ts:1:1`
  )
})

test.serial('write()', async t => {
  const file = new File('foo\nbar\nbaz')
  file.path = './test/fixture/foo.md'
  await file.write()

  await t.notThrowsAsync(fse.access(file.path, fse.constants.F_OK))

  // should error if no path is provided
  await t.throwsAsync(new File().write(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('delete()', async t => {
  const file = new File({ path: './test/fixture/foo.md' })
  await file.delete()

  await t.throwsAsync(fse.access(file.path, fse.constants.F_OK), {
    instanceOf: Error,
    code: 'ENOENT',
    message: "ENOENT: no such file or directory, access './test/fixture/foo.md'"
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
  file.path = './test/fixture/bar.md'
  file.writeSync()

  t.notThrows(() => fse.accessSync(file.path, fse.constants.F_OK))

  // should error if no path is provided
  t.throws(() => new File().writeSync(), {
    instanceOf: TypeError,
    code: 'ERR_INVALID_ARG_TYPE',
    message: /The "path" argument must be of type string/
  })
})

test.serial('deleteSync()', t => {
  const file = new File({ path: './test/fixture/bar.md' })
  file.deleteSync()

  t.throws(() => fse.accessSync(file.path, fse.constants.F_OK), {
    instanceOf: Error,
    code: 'ENOENT',
    message: "ENOENT: no such file or directory, access './test/fixture/bar.md'"
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
    path: './test/fixture/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = await transform(file.toString(), {
    sourcemap: true,
    sourcefile: file.path,
    loader: 'ts'
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map)

  file.rename({ extname: '.js' })
  const minified = await transform(code, {
    minify: true,
    sourcemap: true,
    sourcefile: file.path,
    loader: 'js'
  })
  file.min = {
    code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
    map: JSON.parse(minified.map)
  }

  await file.write()

  await t.notThrowsAsync(
    fse.access('./test/fixture/baz.js', fse.constants.F_OK)
  )
  await t.notThrowsAsync(
    fse.access('./test/fixture/baz.js.map', fse.constants.F_OK)
  )
  await t.notThrowsAsync(
    fse.access('./test/fixture/baz.min.js', fse.constants.F_OK)
  )
  await t.notThrowsAsync(
    fse.access('./test/fixture/baz.min.js.map', fse.constants.F_OK)
  )

  t.is(file.value, await fse.readFile(file.path, 'utf8'))
  t.is(
    JSON.stringify(file.map),
    await fse.readFile('./test/fixture/baz.js.map', 'utf8')
  )
  t.is(file.min.code, await fse.readFile('./test/fixture/baz.min.js', 'utf8'))
  t.is(
    JSON.stringify(file.min.map),
    await fse.readFile('./test/fixture/baz.min.js.map', 'utf8')
  )
})

test.serial('delete() with .map and .min', async t => {
  const file = new File({
    path: './test/fixture/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = await transform(file.toString(), {
    sourcemap: true,
    sourcefile: file.path,
    loader: 'ts'
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map)

  file.rename({ extname: '.js' })
  const minified = await transform(code, {
    minify: true,
    sourcemap: true,
    sourcefile: file.path,
    loader: 'js'
  })
  file.min = {
    code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
    map: JSON.parse(minified.map)
  }

  await file.delete()

  const expectend = {
    instanceOf: Error,
    code: 'ENOENT',
    message: /ENOENT: no such file or directory, access/
  }
  await t.throwsAsync(
    fse.access('./test/fixture/baz.js', fse.constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fse.access('./test/fixture/baz.js.map', fse.constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fse.access('./test/fixture/baz.min.js', fse.constants.F_OK),
    expectend
  )
  await t.throwsAsync(
    fse.access('./test/fixture/baz.min.js.map', fse.constants.F_OK),
    expectend
  )
})

test.serial('writeSync() with .map and .min', t => {
  const file = new File({
    path: './test/fixture/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = transformSync(file.toString(), {
    sourcemap: true,
    sourcefile: file.path,
    loader: 'ts'
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map)

  file.rename({ extname: '.js' })
  const minified = transformSync(code, {
    minify: true,
    sourcemap: true,
    sourcefile: file.path,
    loader: 'js'
  })
  file.min = {
    code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
    map: JSON.parse(minified.map)
  }

  file.writeSync()

  t.notThrows(() => fse.access('./test/fixture/baz.js', fse.constants.F_OK))
  t.notThrows(() => fse.access('./test/fixture/baz.js.map', fse.constants.F_OK))
  t.notThrows(() => fse.access('./test/fixture/baz.min.js', fse.constants.F_OK))
  t.notThrows(() =>
    fse.access('./test/fixture/baz.min.js.map', fse.constants.F_OK)
  )

  t.is(file.value, fse.readFileSync(file.path, 'utf8'))
  t.is(
    JSON.stringify(file.map),
    fse.readFileSync('./test/fixture/baz.js.map', 'utf8')
  )
  t.is(file.min.code, fse.readFileSync('./test/fixture/baz.min.js', 'utf8'))
  t.is(
    JSON.stringify(file.min.map),
    fse.readFileSync('./test/fixture/baz.min.js.map', 'utf8')
  )
})

test.serial('deleteSync() with .map and .min', t => {
  const file = new File({
    path: './test/fixture/baz.ts',
    value: tsCodeMock
  })

  const { code, map } = transformSync(file.toString(), {
    sourcemap: true,
    sourcefile: file.path,
    loader: 'ts'
  })

  file.value = `${code}\n//# sourceMappingURL=${file.path}.map\n`
  file.map = JSON.parse(map)

  file.rename({ extname: '.js' })
  const minified = transformSync(code, {
    minify: true,
    sourcemap: true,
    sourcefile: file.path,
    loader: 'js'
  })
  file.min = {
    code: `${minified.code}\n//# sourceMappingURL=${file.path}.map\n`,
    map: JSON.parse(minified.map)
  }

  file.deleteSync()

  const expectend: ThrowsExpectation = {
    instanceOf: Error,
    code: 'ENOENT',
    message: /ENOENT: no such file or directory, access/
  }
  t.throws(
    () => fse.accessSync('./test/fixture/baz.js', fse.constants.F_OK),
    expectend
  )
  t.throws(
    () => fse.accessSync('./test/fixture/baz.js.map', fse.constants.F_OK),
    expectend
  )
  t.throws(
    () => fse.accessSync('./test/fixture/baz.min.js', fse.constants.F_OK),
    expectend
  )
  t.throws(
    () => fse.accessSync('./test/fixture/baz.min.js.map', fse.constants.F_OK),
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
