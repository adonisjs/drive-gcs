/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import got from 'got'
import test from 'japa'
import { join } from 'path'
import supertest from 'supertest'
import { createServer } from 'http'
import { Logger } from '@adonisjs/logger/build/index'
import { string } from '@poppinss/utils/build/helpers'

import { GcsDriver } from '../src/Drivers/Gcs'
import {
  fs,
  GCS_BUCKET,
  setupApplication,
  authenticationOptions,
  GCS_NO_UNIFORM_ACL_BUCKET,
} from '../test-helpers'

const logger = new Logger({ enabled: true, name: 'adonisjs', level: 'info' })

test.group('GCS driver | put', () => {
  test('write file to the destination', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.getUrl(fileName)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('write to nested path', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')
    await driver.put(fileName, 'hi world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hi world')

    await driver.delete(fileName)
  }).timeout(0)

  test('set custom content-type for the file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, '{ "hello": "world" }', {
      contentType: 'application/json',
    })

    const [metaData] = await driver.adapter.bucket(GCS_BUCKET).file(fileName).getMetadata()
    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
  }).timeout(0)

  test('switch bucket at runtime', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: 'foo',
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.bucket(GCS_BUCKET).put(fileName, 'hello world')
    await driver.bucket(GCS_BUCKET).getUrl(fileName)

    const contents = await driver.bucket(GCS_BUCKET).get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.bucket(GCS_BUCKET).delete(fileName)
  }).timeout(0)
})

test.group('GCS driver | putStream', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('write file to the destination', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await fs.add('foo.txt', 'hello stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('write to nested path', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await fs.add('foo.txt', 'hello stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await fs.add('foo.txt', 'hi stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.put(fileName, 'hello world')
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hi stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('set custom content-type for the file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await fs.add('foo.txt', '{ "hello": "world" }')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream, {
      contentType: 'application/json',
    })

    const [metaData] = await driver.adapter.bucket(GCS_BUCKET).file(fileName).getMetadata()
    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
  }).timeout(0)
})

test.group('S3 Drive | moveToDisk', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('upload small files', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const fileName = `${string.generateRandom(10)}.txt`
    const driver = new GcsDriver(config, logger)

    const app = await setupApplication({ autoProcessMultipartFiles: true })
    const Route = app.container.resolveBinding('Adonis/Core/Route')
    const Server = app.container.resolveBinding('Adonis/Core/Server')

    Server.middleware.register([
      async () => {
        return {
          default: new (app.container.resolveBinding('Adonis/Core/BodyParser'))(app.config, {
            use() {
              return driver
            },
          }),
        }
      },
    ])

    Route.post('/', async ({ request }) => {
      const file = request.file('package')!
      await file.moveToDisk('./', {
        name: fileName,
      })
    })

    Server.optimize()

    const server = createServer(Server.handle.bind(Server))
    await supertest(server).post('/').attach('package', Buffer.from('hello world', 'utf-8'), {
      filename: 'package.txt',
    })

    const [metadata] = await driver.adapter.bucket(config.bucket).file(fileName).getMetadata()
    assert.equal(metadata.size, '11')
    await driver.delete(fileName)
  }).timeout(6000)
})

test.group('GCS driver | multipartStream', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('write file to the destination', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.json`

    const driver = new GcsDriver(config, logger)

    const app = await setupApplication()
    const Route = app.container.resolveBinding('Adonis/Core/Route')
    const Server = app.container.resolveBinding('Adonis/Core/Server')

    Server.middleware.register([
      async () => {
        return {
          default: app.container.resolveBinding('Adonis/Core/BodyParser'),
        }
      },
    ])

    Route.post('/', async ({ request }) => {
      request.multipart.onFile('package', {}, async (part, reportChunk) => {
        part.pause()
        part.on('data', reportChunk)
        await driver.putStream(fileName, part)
      })

      await request.multipart.process()
    })

    Server.optimize()

    const server = createServer(Server.handle.bind(Server))
    await supertest(server).post('/').attach('package', join(__dirname, '..', 'package.json'))

    const contents = await driver.get(fileName)
    assert.equal(
      contents.toString(),
      await fs.fsExtra.readFile(join(__dirname, '..', 'package.json'), 'utf-8')
    )

    await driver.delete(fileName)
  }).timeout(6000)

  test('cleanup stream when validation fails', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.json`

    const driver = new GcsDriver(config, logger)
    const app = await setupApplication()
    const Route = app.container.resolveBinding('Adonis/Core/Route')
    const Server = app.container.resolveBinding('Adonis/Core/Server')

    Server.middleware.register([
      async () => {
        return {
          default: app.container.resolveBinding('Adonis/Core/BodyParser'),
        }
      },
    ])

    Route.post('/', async ({ request }) => {
      request.multipart.onFile('package', { extnames: ['png'] }, async (part, reportChunk) => {
        part.pause()
        part.on('data', reportChunk)
        await driver.putStream(fileName, part)
      })

      await request.multipart.process()
      assert.isTrue(request.file('package')?.hasErrors)
    })

    Server.optimize()

    const server = createServer(Server.handle.bind(Server))
    await supertest(server).post('/').attach('package', join(__dirname, '..', 'package.json'))

    await driver.delete(fileName)
  }).timeout(6000)
})

test.group('GCS driver | exists', () => {
  test('return true when a file exists', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'bar')
    assert.isTrue(await driver.exists(fileName))

    await driver.delete(fileName)
  }).timeout(0)

  test("return false when a file doesn't exists", async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test("return false when a file parent directory doesn't exists", async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test('raise exception when credentials are incorrect', async (assert) => {
    assert.plan(1)

    const config = {
      keyFilename: '',
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)
    try {
      await driver.exists('bar/baz/foo.txt')
    } catch (error) {
      assert.match(error.original.message, /Could not load the default credentials./)
    }
  }).timeout(0)
})

test.group('GCS driver | delete', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('remove file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'bar')
    await driver.delete(fileName)

    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test('do not error when trying to remove a non-existing file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.delete(fileName)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test("do not error when file parent directory doesn't exists", async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.delete(fileName)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)
})

test.group('GCS driver | copy', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('copy file from within the disk root', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test('create intermediate directories when copying a file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test("return error when source doesn't exists", async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)

    try {
      await driver.copy('foo.txt', 'bar.txt')
    } catch (error) {
      assert.equal(
        error.message,
        'E_CANNOT_COPY_FILE: Cannot copy file from "foo.txt" to "bar.txt"'
      )
    }
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.put(fileName1, 'hi world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source acl during copy', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world', { visibility: 'public' })
    await driver.copy(fileName, fileName1)

    const visibility = await driver.getVisibility(fileName1)
    assert.equal(visibility, 'public')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source content-type during copy', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world', { contentType: 'application/json' })
    await driver.copy(fileName, fileName1)

    const [metaData] = await driver.adapter.bucket(GCS_BUCKET).file(fileName).getMetadata()
    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)
})

test.group('GCS driver | move', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('move file from within the disk root', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')
    assert.isFalse(await driver.exists(fileName))

    await driver.delete(fileName1)
  }).timeout(0)

  test('create intermediate directories when moving a file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')
    assert.isFalse(await driver.exists(fileName))

    await driver.delete(fileName1)
  }).timeout(0)

  test("return error when source doesn't exists", async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)

    try {
      await driver.move('foo.txt', 'baz/bar.txt')
    } catch (error) {
      assert.equal(
        error.message,
        'E_CANNOT_MOVE_FILE: Cannot move file from "foo.txt" to "baz/bar.txt"'
      )
    }
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world')
    await driver.put(fileName1, 'hi world')

    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source acl during move', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world', { visibility: 'public' })
    await driver.move(fileName, fileName1)

    const visibility = await driver.getVisibility(fileName1)
    assert.equal(visibility, 'public')

    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source content-type during move', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)

    await driver.put(fileName, 'hello world', { contentType: 'application/json' })
    await driver.move(fileName, fileName1)

    const [metaData] = await driver.adapter.bucket(GCS_BUCKET).file(fileName1).getMetadata()
    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName1)
  }).timeout(0)
})

test.group('GCS driver | get', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('get file contents', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('get file contents as a stream', async (assert, done) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const stream = await driver.getStream(fileName)

    stream.on('data', (chunk) => {
      assert.equal(chunk, 'hello world')
    })
    stream.on('end', async () => {
      await driver.delete(fileName)
      done()
    })
    stream.on('error', (error) => {
      done(error)
    })
  }).timeout(0)

  test("return error when file doesn't exists", async (assert) => {
    assert.plan(1)
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)

    try {
      await driver.get('foo.txt')
    } catch (error) {
      assert.equal(error.message, 'E_CANNOT_READ_FILE: Cannot read file from location "foo.txt"')
    }
  }).timeout(0)
})

test.group('GCS driver | getStats', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('get file stats', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const stats = await driver.getStats(fileName)
    assert.equal(stats.size, 11)
    assert.instanceOf(stats.modified, Date)

    await driver.delete(fileName)
  }).timeout(0)

  test('return error when file is missing', async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_BUCKET,
      usingUniformAcl: true,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)
    const fileName = `${string.generateRandom(10)}.txt`

    try {
      await driver.getStats(fileName)
    } catch (error) {
      assert.equal(
        error.message,
        `E_CANNOT_GET_METADATA: Unable to retrieve the "stats" for file at location "${fileName}"`
      )
    }
  }).timeout(0)
})

test.group('GCS driver | getVisibility', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('get visibility for private file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const visibility = await driver.getVisibility(fileName)
    assert.equal(visibility, 'private')

    await driver.delete(fileName)
  }).timeout(0)

  test('get visibility for public file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'public' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const visibility = await driver.getVisibility(fileName)
    assert.equal(visibility, 'public')

    await driver.delete(fileName)
  }).timeout(0)

  test('return error when file is missing', async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)
    const fileName = `${string.generateRandom(10)}.txt`

    try {
      const response = await driver.getVisibility(fileName)
      console.log({ response })
    } catch (error) {
      assert.equal(
        error.message,
        `E_CANNOT_GET_METADATA: Unable to retrieve the "visibility" for file at location "${fileName}"`
      )
    }
  }).timeout(0)
})

test.group('GCS driver | setVisibility', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('set file visibility', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')
    assert.equal(await driver.getVisibility(fileName), 'private')

    await driver.setVisibility(fileName, 'public')
    assert.equal(await driver.getVisibility(fileName), 'public')

    await driver.delete(fileName)
  }).timeout(0)

  test('return error when file is missing', async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }

    const driver = new GcsDriver(config, logger)
    const fileName = `${string.generateRandom(10)}.txt`

    try {
      await driver.setVisibility(fileName, 'public')
    } catch (error) {
      assert.equal(
        error.message,
        `E_CANNOT_SET_VISIBILITY: Unable to set visibility for file at location "${fileName}"`
      )
    }
  }).timeout(0)
})

test.group('GCS driver | getUrl', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('get url to a given file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'public' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const url = await driver.getUrl(fileName)
    const response = await got.get(url)
    assert.equal(response.body, 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('deny access to private files', async (assert) => {
    assert.plan(1)

    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const url = await driver.getUrl(fileName)

    try {
      await got.get(url)
    } catch (error) {
      assert.equal(error.response.statusCode, 403)
    }

    await driver.delete(fileName)
  }).timeout(0)
})

test.group('GCS driver | getSignedUrl', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('get signed url to a file in private disk', async (assert) => {
    assert.plan(2)

    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    try {
      await got.get(await driver.getUrl(fileName))
    } catch (error) {
      assert.equal(error.response.statusCode, 403)
    }

    const response = await got.get(await driver.getSignedUrl(fileName))
    assert.equal(response.body, 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('define custom content headers for the file', async (assert) => {
    const config = {
      ...authenticationOptions,
      bucket: GCS_NO_UNIFORM_ACL_BUCKET,
      usingUniformAcl: false,
      driver: 'gcs' as const,
      visibility: 'private' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new GcsDriver(config, logger)
    await driver.put(fileName, 'hello world')

    const signedUrl = await driver.getSignedUrl(fileName, {
      contentType: 'application/json',
      contentDisposition: 'attachment',
    })

    const response = await got.get(signedUrl)

    assert.equal(response.headers['content-type'], 'application/json')
    assert.equal(response.headers['content-disposition'], 'attachment')
    assert.equal(response.body, 'hello world')
    await driver.delete(fileName)
  }).timeout(0)
})
