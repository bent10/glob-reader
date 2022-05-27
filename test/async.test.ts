import { dirname, extname, basename } from 'node:path'
import { promises as fsp } from 'node:fs'
import { Buffer } from 'node:buffer'
import { globbySync } from 'globby'
import anyTest, { TestFn } from 'ava'
import { readGlob, File } from '../dist/index.js'
import { size, fromAsync } from './utils.js'

const test = anyTest as TestFn<string[]>

test.before(t => {
  t.context = globbySync('src/*.ts', {
    onlyFiles: true
  })
})

test('no-opts', async t => {
  const files = readGlob('src/*.ts')
  let i = 0

  for await (const file of files) {
    const mockPath = t.context[i]
    const value = await fsp.readFile(mockPath, 'utf8')
    const bytes = Buffer.byteLength(value)

    t.is(file.cwd, process.cwd())
    t.deepEqual(file.data, { matter: {}, stat: {} })
    t.is(file.dry, false)
    t.deepEqual(file.history, [mockPath])
    t.deepEqual(file.messages, [])

    t.true(Buffer.isBuffer(file.value))
    t.deepEqual(file.value, Buffer.from(value))
    t.is(String(file.value), value)
    t.is(file.toString(), value)

    t.is(file.path, mockPath)
    t.is(file.dirname, dirname(mockPath))
    t.is(file.basename, basename(mockPath))
    t.is(file.extname, extname(mockPath))
    t.is(file.stem, basename(mockPath, extname(mockPath)))
    t.is(file.bytes, bytes)
    t.is(file.size, size(bytes))

    i++
  }
})

test('cwd', async t => {
  const files = readGlob('*.ts', {
    cwd: 'src'
  })
  let i = 0

  for await (const file of files) {
    const mockPath = t.context[i].replace('src/', '')

    t.is(file.cwd, 'src')
    t.deepEqual(file.history, [mockPath])
    t.is(file.path, mockPath)
    t.is(file.dirname, dirname(mockPath))
    t.is(file.basename, basename(mockPath))
    t.is(file.extname, extname(mockPath))
    t.is(file.stem, basename(mockPath, extname(mockPath)))

    i++
  }
})

test('ignore', async t => {
  const files = readGlob('src/*.ts', {
    ignore: ['src/(a)?sync.ts']
  })

  t.plan(3)
  for await (const file of files) {
    t.false(/a?sync/.test(<string>file.stem))
  }
})

test('encoding', async t => {
  const files = readGlob('src/*.ts', 'utf8')
  let i = 0

  for await (const file of files) {
    const value = await fsp.readFile(t.context[i], 'utf8')

    t.false(Buffer.isBuffer(file.value))
    t.true(typeof file.value === 'string')
    t.is(file.value, value)

    i++
  }
})

test('fsStats', async t => {
  const files = readGlob('src/*.ts', { fsStats: true })
  let i = 0

  for await (const file of files) {
    const mockPath = t.context[i]
    t.deepEqual(file.data.stat, await fsp.stat(mockPath))

    i++
  }
})

test('dry run', async t => {
  const files = readGlob('src/*.ts', {
    fsStats: true, // should be ignored
    dry: true
  })

  for await (const file of files) {
    t.deepEqual(file.data, { matter: {}, stat: {} })
    t.true(file.dry)
    t.is(file.value, '')
    t.is(file.bytes, 0)
    t.is(file.size, '0B')
  }
})

test('flatten', async t => {
  const files = readGlob('src/*.ts')
  const fileArr = await fromAsync(files)

  t.is(fileArr.length, 5)

  fileArr.forEach(file => {
    t.true(file instanceof File)
    t.true(file.value instanceof Buffer)
    t.true(file.data.stat instanceof Object)
    t.true(file.history instanceof Array)
    t.true(file.messages instanceof Array)
  })
})
