import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const fileExtensionByMimeType: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_CARD_IMAGE_BYTES = 10 * 1024 * 1024;

export class CardImageUploadError extends Error {}

function sanitizeFileStem(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'card-image';
}

function getFileExtension(file: File) {
  const explicitExtension = file.name.split('.').pop()?.toLowerCase();

  if (explicitExtension && explicitExtension.length <= 8) {
    return explicitExtension;
  }

  return fileExtensionByMimeType[file.type] ?? 'bin';
}

function createUploadFilename(file: File) {
  return `${sanitizeFileStem(file.name)}-${randomUUID()}.${getFileExtension(file)}`;
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL === '1');
}

function validateImageFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new CardImageUploadError('Only JPEG, PNG, WebP, GIF, and AVIF images are supported.');
  }

  if (file.size > MAX_CARD_IMAGE_BYTES) {
    throw new CardImageUploadError('Images must be 10 MB or smaller.');
  }
}

async function storeLocally(file: File, fileName: string) {
  const uploadDirectory = path.join(process.cwd(), 'public', 'uploads', 'card-images');
  const absoluteFilePath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(absoluteFilePath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/card-images/${fileName}`;
}

async function storeInBlob(file: File, fileName: string) {
  const blob = await put(`card-images/${fileName}`, file, {
    access: 'public',
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

export async function uploadCardImage(file: File) {
  validateImageFile(file);

  const fileName = createUploadFilename(file);
  const url = shouldUseBlobStorage()
    ? await storeInBlob(file, fileName)
    : await storeLocally(file, fileName);

  return {
    alt: sanitizeFileStem(file.name).replace(/-/g, ' '),
    name: file.name,
    type: file.type,
    url,
  };
}
