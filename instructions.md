The package has been configured successfully!

## Validating environment variables

The configuration for GCS relies on certain environment variables and it is usually a good practice to validate the presence of those environment variables.

Open `env.ts` file and paste the following code inside it.

```ts
GCS_KEY_FILENAME: Env.schema.string(),
GCS_BUCKET: Env.schema.string(),
```

## Update `contracts/drive.ts` file

Next, you must inform the TypeScript static compiler about the disk that will be using the gcs driver.

Open the `contracts/drive.ts` file and paste the following code snippet inside it.

```ts
declare module '@ioc:Adonis/Core/Drive' {
  interface DisksList {
    // ... other disks
    gcs: {
      config: GcsDriverConfig
      implementation: GcsDriverContract
    }
  }
}
```

## Define config

Once you define the disk inside the contracts file. The TypeScript will automatically validate the drive config file and will force you to define the config for the disk as well.

Open the `config/drive.ts` and paste the following code snippet inside it.

```ts
{
  disks: {
    // ... other disk
    gcs: {
      driver: 'gcs',
      visibility: 'private',
      keyFilename: Env.get('GCS_KEY_FILENAME'),
      bucket: Env.get('GCS_BUCKET'),
      usingUniformAcl: false
    }
  }
}
```
