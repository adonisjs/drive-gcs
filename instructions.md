The package has been configured successfully!

## Validating environment variables

The configuration for GCS relies on certain environment variables and it is usually a good practice to validate the presence of those environment variables.

Open `env.ts` file and paste the following code inside it.

```ts
GCS_KEY_FILENAME: Env.schema.string(),
GCS_BUCKET: Env.schema.string(),
```

## Define config
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
