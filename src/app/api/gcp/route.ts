import { Storage } from '@google-cloud/storage';
import { NextRequest, NextResponse } from 'next/server';

// Validate environment variables
const validateGcpEnv = () => {
  const bucketName = process.env.GCP_BUCKET_NAME;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!bucketName || !credentialsPath) {
    throw new Error('Missing GCP environment variables. Please set GCP_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS');
  }
  
  return { bucketName, credentialsPath };
};

// Initialize GCP Storage client with validation
let storage: Storage;
let bucketName: string;

try {
  const { bucketName: bucket, credentialsPath } = validateGcpEnv();
  bucketName = bucket;
  storage = new Storage({
    keyFilename: credentialsPath,
  });
} catch (error) {
  console.error('GCP client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload file to GCP
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(file.name);
    
    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    
    return NextResponse.json({ message: 'Upload successful' });
  } catch (err) {
    console.error('GCP upload failed:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const bucket = storage.bucket(bucketName);
    
    if (key) {
      // Download a file
      try {
        const blob = bucket.file(key);
        const [exists] = await blob.exists();
        
        if (!exists) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        
        // Generate signed URL for download
        const [signedUrl] = await blob.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        
        // Download the file content
        const [fileContent] = await blob.download();
        
        // Get metadata
        const [metadata] = await blob.getMetadata();
        
        return new NextResponse(fileContent, {
          status: 200,
          headers: {
            'Content-Type': metadata.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${key}"`,
          },
        });
      } catch (err) {
        console.error('GCP download failed:', err);
        return NextResponse.json({ 
          error: 'GetFile failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    } else {
      // List all files
      try {
        const [files] = await bucket.getFiles();
        const fileList = files.map(file => ({
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.metadata?.updated,
          contentType: file.metadata?.contentType,
        }));
        
        return NextResponse.json({ files: fileList });
      } catch (err) {
        console.error('GCP list files failed:', err);
        return NextResponse.json({ 
          error: 'ListFiles failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    }
  } catch (err) {
    console.error('GCP GET failed:', err);
    return NextResponse.json({ 
      error: 'GCP operation failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }
    
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(key);
    
    // Check if file exists
    const [exists] = await blob.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Delete the file
    await blob.delete();
    
    return NextResponse.json({ message: 'Delete successful' });
  } catch (err) {
    console.error('GCP delete failed:', err);
    return NextResponse.json({ 
      error: 'DeleteFile failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
} 