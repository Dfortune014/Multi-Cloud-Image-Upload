import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { fileName } = body;

    // Validate required fields
    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Create DeleteObject command
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    // Generate presigned URL (valid for 5 minutes for deletes)
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300, // 5 minutes
    });

    // Log the request for audit purposes
    console.log(`Presigned delete URL generated for file: ${fileName}`);

    const response = NextResponse.json({
      presignedUrl,
      fileName,
      expiresIn: 300,
      message: 'Presigned delete URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('AWS presigned delete URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned delete URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 