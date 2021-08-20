/*
 * @adonisjs/drive-s3
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class GcsProvider {
  constructor(protected app: ApplicationContract) {}

  public boot() {
    this.app.container.withBindings(['Adonis/Core/Drive'], (Drive) => {
      Drive.extend('gcs', (_, __, config) => {
        const { GcsDriver } = require('../src/Drivers/Gcs')
        return new GcsDriver(config)
      })
    })
  }
}
