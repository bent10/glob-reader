import { EOL } from 'node:os'
import { dirname, extname, basename } from 'node:path'
import { readFileSync, statSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import fastGlob from 'fast-glob'
import anyTest, { TestFn } from 'ava'
import { readGlobSync, File } from '../dist/index.js'
import { size } from './utils.js'

const test = anyTest as TestFn<string[]>

test.before(t => {
  t.context = fastGlob.sync('src/*.ts', {
    onlyFiles: true
  })
})

test('no-opts', t => {
  const files = readGlobSync('src/*.ts')
  let i = 0

  for (const file of files) {
    const mockPath = t.context[i]
    const value = readFileSync(mockPath, 'utf8')
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

test('cwd', t => {
  const files = readGlobSync('*.ts', {
    cwd: 'src'
  })
  let i = 0

  for (const file of files) {
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

test('ignore', t => {
  const files = readGlobSync('src/*.ts', {
    ignore: ['src/(a)?sync.ts']
  })

  t.plan(3)
  for (const file of files) {
    t.false(/a?sync/.test(<string>file.stem))
  }
})

test('encoding', t => {
  const files = readGlobSync('src/*.ts', 'utf8')
  let i = 0

  for (const file of files) {
    const value = readFileSync(t.context[i], 'utf8')

    t.false(Buffer.isBuffer(file.value))
    t.true(typeof file.value === 'string')
    t.is(file.value, value)

    i++
  }
})

test('stripMatter', t => {
  const unstriped = readGlobSync('test/fixtures/*.html', {
    encoding: 'utf8'
  })

  for (const file of unstriped) {
    t.is(
      file.value,
      `---${EOL}title: Hello, world!${EOL}---${EOL}${EOL}<p>Some more text</p>${EOL}`
    )
  }

  const striped = readGlobSync('test/fixtures/*.html', {
    encoding: 'utf8',
    stripMatter: true
  })

  for (const file of striped) {
    t.is(file.value, `${EOL}<p>Some more text</p>${EOL}`)
  }
})

test('fsStats', t => {
  const files = readGlobSync('src/*.ts', { fsStats: true })
  let i = 0

  for (const file of files) {
    const mockPath = t.context[i]
    t.deepEqual(file.data.stat, statSync(mockPath))

    i++
  }
})

test('dry run', t => {
  const files = readGlobSync('src/*.ts', {
    fsStats: true, // should be ignored
    dry: true
  })

  for (const file of files) {
    t.deepEqual(file.data, { matter: {}, stat: {} })
    t.true(file.dry)
    t.is(file.value, '')
    t.is(file.bytes, 0)
    t.is(file.size, '0B')
  }
})

test('flatten', t => {
  const files = readGlobSync('src/*.ts')
  const fileArr = [...files]

  t.is(fileArr.length, 5)

  fileArr.forEach(file => {
    t.true(file instanceof File)
    t.true(file.value instanceof Buffer)
    t.true(file.data.stat instanceof Object)
    t.true(file.history instanceof Array)
    t.true(file.messages instanceof Array)
  })
})
