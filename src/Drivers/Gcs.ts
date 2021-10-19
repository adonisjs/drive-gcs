/*
 * @adonisjs/gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  CannotCopyFileException,
  CannotMoveFileException,
  CannotReadFileException,
  CannotWriteFileException,
  CannotDeleteFileException,
  CannotGetMetaDataException,
  CannotSetVisibilityException,
} from '@adonisjs/core/build/standalone'

import {
  Visibility,
  WriteOptions,
  ContentHeaders,
  DriveFileStats,
  GcsDriverConfig,
  GcsDriverContract,
} from '@ioc:Adonis/Core/Drive'

import { promisify } from 'util'
import { pipeline } from 'stream'
import { string } from '@poppinss/utils/build/helpers'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { Storage, Bucket, GetSignedUrlConfig, File } from '@google-cloud/storage'

const pipelinePromise = promisify(pipeline)

export class GcsDriver implements GcsDriverContract {
  /**
   * Reference to the bucket
   */
  private bucket: Bucket

  /**
   * Reference to the gcs storage instance
   */
  public adapter: Storage

  /**
   * Name of the driver
   */
  public name: 'gcs' = 'gcs'

  /**
   * The entity name that corresponds to public
   */
  private aclPublicEntity = 'allUsers'

  /**
   * The Role for the grant applicable to public
   */
  private aclPublicRole = 'READER'

  constructor(private config: GcsDriverConfig, private logger: LoggerContract) {
    this.adapter = new Storage(this.config)
    this.bucket = this.adapter.bucket(this.config.bucket)
  }

  /**
   * Transforms the write options to GCS properties. Checkout the
   * following example in the docs to see the available options
   *
   * https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream
   */
  private transformWriteOptions(options?: WriteOptions) {
    const {
      visibility,
      contentType,
      contentDisposition,
      contentEncoding,
      contentLanguage,
      ...adapterOptions
    } = Object.assign({ visibility: this.config.visibility }, options)

    adapterOptions.metadata = {}

    if (contentType) {
      adapterOptions['contentType'] = contentType
    }

    if (contentDisposition) {
      adapterOptions.metadata['contentDisposition'] = contentDisposition
    }

    if (contentEncoding) {
      adapterOptions.metadata['contentEncoding'] = contentEncoding
    }

    if (contentLanguage) {
      adapterOptions.metadata['contentLanguage'] = contentLanguage
    }

    /**
     * Set predefined ACL only when not using uniformAcl
     */
    if (!this.config.usingUniformAcl) {
      if (visibility === 'public') {
        adapterOptions['predefinedAcl'] = 'publicRead'
      } else if (visibility === 'private') {
        adapterOptions['predefinedAcl'] = 'private'
      }
    }

    this.logger.trace(adapterOptions, '@drive/gcs write options')
    return adapterOptions
  }

  /**
   * Transform content headers to GCS response headers
   */
  private transformContentHeaders(options?: ContentHeaders) {
    const contentHeaders: Partial<GetSignedUrlConfig> = {}
    const { contentType, contentDisposition } = options || {}

    if (contentType) {
      contentHeaders['responseType'] = contentType
    }
    if (contentDisposition) {
      contentHeaders['responseDisposition'] = contentDisposition
    }

    this.logger.trace(contentHeaders, '@drive/gcs content headers')
    return contentHeaders
  }

  /**
   * Converts ms expression to milliseconds
   */
  private msToTimeStamp(ms: string | number) {
    return new Date(Date.now() + string.toMs(ms)).getTime()
  }

  /**
   * Returns the ACL for a given file
   */
  private async getFileAcl(file: File) {
    try {
      const [acl] = await file.acl.get({ entity: this.aclPublicEntity })
      const publicEntry = (Array.isArray(acl) ? acl : [acl]).find(
        (entry) => entry.entity === this.aclPublicEntity
      )

      return publicEntry && publicEntry.role === this.aclPublicRole
        ? ('public' as const)
        : ('private' as const)
    } catch {
      return 'private' as const
    }
  }

  /**
   * Returns the file contents as a buffer. The buffer return
   * value allows you to self choose the encoding when
   * converting the buffer to a string.
   */
  public async get(location: string): Promise<Buffer> {
    try {
      const [file] = await this.bucket.file(location).download()
      return file
    } catch (error) {
      throw CannotReadFileException.invoke(location, error)
    }
  }

  /**
   * Returns the file contents as a stream
   */
  public async getStream(location: string): Promise<NodeJS.ReadableStream> {
    return this.bucket.file(location).createReadStream()
  }

  /**
   * A boolean to find if the location path exists or not
   */
  public async exists(location: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(location).exists()
      return exists
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'exists', error)
    }
  }

  /**
   * Returns the file visibility
   */
  public async getVisibility(location: string): Promise<Visibility> {
    try {
      /**
       * The `isPublic` method on GCS SDK returns in false positive when
       * the file itself doesn't exists. It will return "false" for
       * non-existing files.
       *
       * Therefore we fetch the object and then inspect its ACL policy
       * for all users
       */
      const [file] = await this.bucket.file(location).get()
      return await this.getFileAcl(file)
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'visibility', error)
    }
  }

  /**
   * Returns the file stats
   */
  public async getStats(location: string): Promise<DriveFileStats> {
    try {
      const [metaData] = await this.bucket.file(location).getMetadata()

      return {
        modified: new Date(metaData.updated),
        size: metaData.size!,
        isFile: true,
        etag: metaData.etag,
      }
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'stats', error)
    }
  }

  /**
   * Returns the signed url for a given path
   */
  public async getSignedUrl(
    location: string,
    options?: ContentHeaders & { expiresIn?: string | number }
  ): Promise<string> {
    try {
      const [url] = await this.bucket.file(location).getSignedUrl({
        action: 'read',
        /**
         * Using v2 doesn't allow overriding content-type header
         */
        version: 'v4',
        expires: this.msToTimeStamp(options?.expiresIn || '6days'),
        ...this.transformContentHeaders(options),
      })
      return url
    } catch (error) {
      console.log(error)
      throw CannotGetMetaDataException.invoke(location, 'signedUrl', error)
    }
  }

  /**
   * Returns URL to a given path
   */
  public async getUrl(location: string): Promise<string> {
    return this.bucket.file(location).publicUrl()
  }

  /**
   * Write string|buffer contents to a destination. The missing
   * intermediate directories will be created (if required).
   */
  public async put(
    location: string,
    contents: Buffer | string,
    options?: WriteOptions
  ): Promise<void> {
    try {
      await this.bucket.file(location).save(contents, {
        resumable: false,
        ...this.transformWriteOptions(options),
      })
    } catch (error) {
      throw CannotWriteFileException.invoke(location, error)
    }
  }

  /**
   * Write a stream to a destination. The missing intermediate
   * directories will be created (if required).
   */
  public async putStream(
    location: string,
    contents: NodeJS.ReadableStream,
    options?: WriteOptions
  ): Promise<void> {
    try {
      const destination = this.bucket.file(location).createWriteStream({
        resumable: false,
        ...this.transformWriteOptions(options),
      })
      await pipelinePromise(contents, destination)
    } catch (error) {
      throw CannotWriteFileException.invoke(location, error)
    }
  }

  /**
   * Not supported
   */
  public async setVisibility(location: string, visibility: Visibility): Promise<void> {
    try {
      const file = this.bucket.file(location)
      visibility === 'public' ? await file.makePublic() : await file.makePrivate()
    } catch (error) {
      throw CannotSetVisibilityException.invoke(location, error)
    }
  }

  /**
   * Remove a given location path
   */
  public async delete(location: string): Promise<void> {
    try {
      await this.bucket.file(location).delete({ ignoreNotFound: true })
    } catch (error) {
      throw CannotDeleteFileException.invoke(location, error)
    }
  }

  /**
   * Copy a given location path from the source to the desination.
   * The missing intermediate directories will be created (if required)
   */
  public async copy(source: string, destination: string, options?: WriteOptions): Promise<void> {
    options = options || {}

    try {
      /**
       * Copy visibility from the source. GCS doesn't retain the original
       * ACL. https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
       */
      if (!options.visibility && !this.config.usingUniformAcl) {
        options.visibility = await this.getVisibility(source)
      }

      await this.bucket.file(source).copy(destination, this.transformWriteOptions(options))
    } catch (error) {
      throw CannotCopyFileException.invoke(source, destination, error.original || error)
    }
  }

  /**
   * Move a given location path from the source to the desination.
   * The missing intermediate directories will be created (if required)
   */
  public async move(source: string, destination: string, options?: WriteOptions): Promise<void> {
    try {
      await this.copy(source, destination, options)
      await this.delete(source)
    } catch (error) {
      throw CannotMoveFileException.invoke(source, destination, error.original || error)
    }
  }
}
