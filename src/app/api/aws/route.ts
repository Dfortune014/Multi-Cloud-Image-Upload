// import modules
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Validate environment variables
const validateAwsEnv = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET;
  
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing AWS environment variables. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET');
  }
  
  return { region, accessKeyId, secretAccessKey, bucketName };
};

// Initialize S3 client with validation
let s3: S3Client;
let bucketName: string;

try {
  const { region, accessKeyId, secretAccessKey, bucketName: bucket } = validateAwsEnv();
  bucketName = bucket;
  s3 = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
} catch (error) {
  console.error('AWS client initialization failed:', error);
}

// create upload function
export async function POST(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const provider = formData.get('provider') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadParams = {
      Bucket: bucketName,
      Key: file.name, 
      Body: buffer,
      ContentType: file.type,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    return NextResponse.json({ message: 'Upload successful' });
  } catch (err) {
    console.error('AWS upload failed:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
} 

// GET: Download a file from S3 or list all files
export async function GET(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (key) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const data = await s3.send(command);
        // data.Body is a stream, you may need to convert it to a buffer
        const streamToBuffer = async (stream: any) => {
          return new Promise<Buffer>((resolve, reject) => {
            const chunks: any[] = [];
            stream.on('data', (chunk: any) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
          });
        };
        const fileBuffer = await streamToBuffer(data.Body);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': data.ContentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${key}"`,
          },
        });
      } catch (err) {
        console.error('AWS download failed:', err);
        return NextResponse.json({ 
          error: 'GetObject failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    } else {
      // List all objects in the bucket
      try {
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
        });
        const data = await s3.send(command);
        const files = (data.Contents || []).map(obj => ({
          name: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        }));
        return NextResponse.json({ files });
      } catch (err) {
        console.error('AWS list objects failed:', err);
        return NextResponse.json({ 
          error: 'ListObjects failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    }
  } catch (err) {
    console.error('AWS GET failed:', err);
    return NextResponse.json({ 
      error: 'AWS operation failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// DELETE: Remove a file from S3
export async function DELETE(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3.send(command);
    return NextResponse.json({ message: 'Delete successful' });
  } catch (err) {
    console.error('AWS delete failed:', err);
    return NextResponse.json({ 
      error: 'DeleteObject failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
} 