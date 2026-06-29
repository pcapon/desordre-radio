import type { Core } from '@strapi/strapi';

/**
 * Media upload provider.
 *
 * Production should not serve track/replay audio through Strapi itself. When
 * S3_* env vars are present we use the aws-s3 provider — note this speaks the
 * S3 PROTOCOL and is NOT tied to AWS. With a custom `endpoint` it works with
 * any S3-compatible store: self-hosted MinIO (data stays on your EU VPS) or a
 * European provider (Scaleway, OVHcloud, Exoscale, Hetzner, Infomaniak…).
 * Without S3_BUCKET, Strapi falls back to its built-in local provider (dev).
 */
const config = ({ env }: Core.Config.Shared.ConfigParams) => {
  const bucket = env('S3_BUCKET');
  if (!bucket) return {};

  return {
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          // Public base URL for serving files (set to your CDN; for MinIO use
          // the public endpoint). Leave unset to use the S3 endpoint directly.
          baseUrl: env('CDN_URL', undefined),
          rootPath: env('S3_ROOT_PATH', undefined),
          s3Options: {
            credentials: {
              accessKeyId: env('S3_ACCESS_KEY_ID'),
              secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
            },
            region: env('S3_REGION', 'us-east-1'),
            // MinIO / non-AWS endpoint; omit for real AWS S3.
            endpoint: env('S3_ENDPOINT', undefined),
            // MinIO requires path-style addressing.
            forcePathStyle: env.bool('S3_FORCE_PATH_STYLE', true),
            params: { Bucket: bucket },
          },
        },
        actionOptions: { upload: {}, uploadStream: {}, delete: {} },
      },
    },
  };
};

export default config;
