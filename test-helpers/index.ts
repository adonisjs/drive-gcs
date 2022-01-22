/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import dotenv from 'dotenv'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'

dotenv.config()

export const GCS_KEY = process.env.GCS_KEY
export const GCS_BUCKET = process.env.GCS_BUCKET!
export const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID!
export const GCS_NO_UNIFORM_ACL_BUCKET = process.env.GCS_NO_UNIFORM_ACL_BUCKET!
export const GCS_KEY_FILENAME = process.env.GCS_KEY_FILENAME
  ? join(__dirname, '..', process.env.GCS_KEY_FILENAME!)
  : null

export const authenticationOptions = GCS_KEY_FILENAME
  ? {
      keyFilename: GCS_KEY_FILENAME,
    }
  : {
      projectId: GCS_PROJECT_ID,
      credentials: JSON.parse(GCS_KEY!),
    }

export const fs = new Filesystem(join(__dirname, '__app'))

/**
 * Setup adonisjs application
 */
export async function setupApplication() {
  const app = new Application(fs.basePath, 'web', {
    providers: ['@adonisjs/core'],
  })

  await fs.add(
    'config/app.ts',
    `export default {
        appKey: 'asecurerandomsecretkey',
        http: {
          cookie: {},
          trustProxy: () => true
        }
      }`
  )

  await fs.add(
    'config/bodyparser.ts',
    `export default {
      whitelistedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
      multipart: {
        autoProcess: false,
        processManually: [],
        types: [
          'multipart/form-data',
        ],
      }
    }`
  )

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  return app
}
