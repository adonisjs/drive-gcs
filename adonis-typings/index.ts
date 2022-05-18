/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Drive' {
  import { StorageOptions, Storage } from '@google-cloud/storage'

  /**
   * Configuration accepted by the gcs driver
   */
  export type GcsDriverConfig = StorageOptions & {
    driver: 'gcs'
    visibility: Visibility
    bucket: string
    usingUniformAcl?: boolean
    cdnUrl?: string
  }

  /**
   * The S3 driver implementation interface
   */
  export interface GcsDriverContract extends DriverContract {
    name: 'gcs'
    adapter: Storage
  }

  interface DriversList {
    gcs: {
      implementation: GcsDriverContract
      config: GcsDriverConfig
    }
  }
}
