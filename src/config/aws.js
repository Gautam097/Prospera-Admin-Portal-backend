import 'dotenv/config';
import { SESClient } from '@aws-sdk/client-ses';
import { S3Client } from '@aws-sdk/client-s3';

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const region = process.env.AWS_REGION;

export const sesClient = new SESClient({ region, credentials });
export const s3Client = new S3Client({ region, credentials });
