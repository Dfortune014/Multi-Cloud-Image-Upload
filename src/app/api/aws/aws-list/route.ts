import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

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

export async function GET(req: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!s3 || !bucketName) {
      const response = NextResponse.json({ 
        error: 'AWS client not initialized. Please check environment variables.' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    // List all objects in the bucket
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const data = await s3.send(command);
    const files = (data.Contents || []).map(obj => ({
      name: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    // Log the request for audit purposes
    console.log(`Listed ${files.length} files from S3 bucket`);

    const response = NextResponse.json({ files });
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('AWS list objects failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to list files', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 