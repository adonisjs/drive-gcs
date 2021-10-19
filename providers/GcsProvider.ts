/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { GcsDriver } from '../src/Drivers/Gcs'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class GcsProvider {
  constructor(protected app: ApplicationContract) {}

  public boot() {
    this.app.container.withBindings(
      ['Adonis/Core/Drive', 'Adonis/Core/Logger'],
      (Drive, Logger) => {
        Drive.extend('gcs', (_, __, config) => {
          return new GcsDriver(config, Logger)
        })
      }
    )
  }
}
