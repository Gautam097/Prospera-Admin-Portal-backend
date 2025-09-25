import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../../config/aws.js";
import { randomUUID } from "crypto";
import mime from "mime-types";
import path from "path";
import fs from "fs";

export const uploadFile = async (filePath, originalName, folder = "") => {
    const fileStream = fs.createReadStream(filePath);
    const ext = path.extname(originalName)?.replace(/^\./, "") || "bin";
    const key = `investor-portal/${folder}/${randomUUID()}.${ext}`;
    const contentType = mime.lookup(ext) || "application/octet-stream";

    const uploadParams = {
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    return key;
};

export const generatePresignedUrl = async (key, expiresIn = 3600) => {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
};

export const deleteFile = async (key) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
    });

    await s3Client.send(command);
};

export const getObjectCdnUrl = async (key) => {
    return `${process.env.AWS_CDN_URL}/${key}`;
}