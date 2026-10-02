import { NextRequest, NextResponse } from 'next/server';
import { getBaasEngine } from '@/lib/db-server/server-state';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucketId = searchParams.get('bucket');
    const baas = getBaasEngine();

    if (!bucketId) {
      const buckets = baas.getBuckets();
      return NextResponse.json({ success: true, buckets });
    }

    const files = baas.getFiles(bucketId);
    return NextResponse.json({ success: true, bucketId, files });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'upload_file', name, isPublic = true, bucketId, sizeBytes, mimeType, customUrl } = body;
    const baas = getBaasEngine();

    if (action === 'create_bucket') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Bucket name required' }, { status: 400 });
      }
      const bucket = baas.createBucket(name, isPublic);
      return NextResponse.json({ success: true, bucket });
    }

    if (action === 'upload_file') {
      if (!bucketId || !name) {
        return NextResponse.json({ success: false, error: 'BucketId and file name required' }, { status: 400 });
      }
      const file = baas.uploadFile(
        bucketId,
        name,
        sizeBytes || Math.floor(Math.random() * 450000) + 12000,
        mimeType || 'image/png',
        customUrl
      );
      return NextResponse.json({ success: true, file });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucketId = searchParams.get('bucket');
    const fileId = searchParams.get('fileId');
    const baas = getBaasEngine();

    if (!bucketId) {
      return NextResponse.json({ success: false, error: 'Bucket parameter required' }, { status: 400 });
    }

    if (fileId) {
      const ok = baas.deleteFile(bucketId, fileId);
      return NextResponse.json({ success: ok, message: 'File deleted' });
    }

    const ok = baas.deleteBucket(bucketId);
    return NextResponse.json({ success: ok, message: 'Bucket deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
