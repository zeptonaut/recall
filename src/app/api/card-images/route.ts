import { NextResponse } from 'next/server';
import { CardImageUploadError, uploadCardImage } from '@/lib/card-image-storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No images were provided.' }, { status: 400 });
    }

    const uploadedFiles = await Promise.all(files.map((file) => uploadCardImage(file)));

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    const message = error instanceof CardImageUploadError
      ? error.message
      : 'Could not upload the image.';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
