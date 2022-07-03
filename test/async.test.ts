import { EOL } from 'node:os'
import { dirname, extname, basename } from 'node:path'
import { promises as fsp } from 'node:fs'
import { Buffer } from 'node:buffer'
import fastGlob from 'fast-glob'
import { readGlob, File } from '../dist/index.js'
import { size, fromAsync } from './utils.js'

const mockPaths = fastGlob.sync('src/*.ts', {
  onlyFiles: true
})

test('no-opts', async () => {
  const files = readGlob('src/*.ts')
  let i = 0

  for await (const file of files) {
    const mockPath = mockPaths[i]
    const value = await fsp.readFile(mockPath, 'utf8')
    const bytes = Buffer.byteLength(value)

    expect(file.cwd).toBe(process.cwd())
    expect(file.data).toEqual({ matter: {}, stat: {} })
    expect(file.dry).toBe(false)
    expect(file.history).toEqual([mockPath])
    expect(file.messages).toEqual([])

    expect(Buffer.isBuffer(file.value)).toBe(true)
    expect(file.value).toEqual(Buffer.from(value))
    expect(String(file.value)).toBe(value)
    expect(file.toString()).toBe(value)

    expect(file.path).toBe(mockPath)
    expect(file.dirname).toBe(dirname(mockPath))
    expect(file.basename).toBe(basename(mockPath))
    expect(file.extname).toBe(extname(mockPath))
    expect(file.stem).toBe(basename(mockPath, extname(mockPath)))
    expect(file.bytes).toBe(bytes)
    expect(file.size).toBe(size(bytes))

    i++
  }
})

test('cwd', async () => {
  const files = readGlob('*.ts', {
    cwd: 'src'
  })
  let i = 0

  for await (const file of files) {
    const mockPath = mockPaths[i].replace('src/', '')

    expect(file.cwd).toBe('src')
    expect(file.history).toEqual([mockPath])
    expect(file.path).toBe(mockPath)
    expect(file.dirname).toBe(dirname(mockPath))
    expect(file.basename).toBe(basename(mockPath))
    expect(file.extname).toBe(extname(mockPath))
    expect(file.stem).toBe(basename(mockPath, extname(mockPath)))

    i++
  }
})

test('ignore', async () => {
  const files = readGlob('src/*.ts', {
    ignore: ['src/(a)?sync.ts']
  })

  expect.assertions(3)
  for await (const file of files) {
    expect(/a?sync/.test(<string>file.stem)).toBe(false)
  }
})

test('encoding', async () => {
  const files = readGlob('src/*.ts', 'utf8')
  let i = 0

  for await (const file of files) {
    const value = await fsp.readFile(mockPaths[i], 'utf8')

    expect(Buffer.isBuffer(file.value)).toBe(false)
    expect(typeof file.value === 'string').toBe(true)
    expect(file.value).toBe(value)

    i++
  }
})

test('stripMatter', async () => {
  const unstriped = readGlob('test/fixtures/*.html', {
    encoding: 'utf8'
  })

  for await (const file of unstriped) {
    expect(file.value).toBe(
      `---${EOL}title: Hello, world!${EOL}---${EOL}${EOL}<p>Some more text</p>${EOL}`
    )
  }

  const striped = readGlob('test/fixtures/*.html', {
    encoding: 'utf8',
    stripMatter: true
  })

  for await (const file of striped) {
    expect(file.value).toBe(`${EOL}<p>Some more text</p>${EOL}`)
  }
})

test('fsStats', async () => {
  const files = readGlob('src/*.ts', { fsStats: true })
  let i = 0

  for await (const file of files) {
    const mockPath = mockPaths[i]
    expect(file.data.stat).toEqual(await fsp.stat(mockPath))

    i++
  }
})

test('dry run', async () => {
  const files = readGlob('src/*.ts', {
    fsStats: true, // should be ignored
    dry: true
  })

  for await (const file of files) {
    expect(file.data).toEqual({ matter: {}, stat: {} })
    expect(file.dry).toBe(true)
    expect(file.value).toBe('')
    expect(file.bytes).toBe(0)
    expect(file.size).toBe('0B')
  }
})

test('flatten', async () => {
  const files = readGlob('src/*.ts')
  const fileArr = await fromAsync(files)

  expect(fileArr.length).toBe(5)

  fileArr.forEach(file => {
    expect(file instanceof File).toBe(true)
    expect(file.value instanceof Buffer).toBe(true)
    expect(file.data.stat instanceof Object).toBe(true)
    expect(file.history instanceof Array).toBe(true)
    expect(file.messages instanceof Array).toBe(true)
  })
})
