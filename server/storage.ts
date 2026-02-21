/**
 * File storage utilities.
 *
 * The Manus-specific storage proxy has been removed.
 * For production file uploads, use a standard S3-compatible provider:
 *   - AWS S3
 *   - Cloudflare R2
 *   - Backblaze B2
 *   - Supabase Storage
 *
 * The @aws-sdk/client-s3 package is already included as a dependency.
 *
 * Example setup:
 *   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
 *   const s3 = new S3Client({ region: process.env.AWS_REGION });
 *   await s3.send(new PutObjectCommand({ Bucket, Key, Body }));
 */

export async function storagePut(
  _relKey: string,
  _data: Buffer | Uint8Array | string,
  _contentType?: string
): Promise<{ key: string; url: string }> {
  throw new Error(
    "File storage is not configured. Set up an S3-compatible provider in server/storage.ts."
  );
}

export async function storageGet(
  _relKey: string
): Promise<{ key: string; url: string }> {
  throw new Error(
    "File storage is not configured. Set up an S3-compatible provider in server/storage.ts."
  );
}
