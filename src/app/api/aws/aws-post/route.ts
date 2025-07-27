import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
    const { fileName, fileType, fileSize } = body;

    // Validate required fields
    if (!fileName || !fileType) {
      const response = NextResponse.json({ 
        error: 'Missing required fields: fileName and fileType are required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Validate file type (optional security measure)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(fileType)) {
      const response = NextResponse.json({ 
        error: 'Invalid file type. Only image files are allowed.' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Validate file size (optional security measure)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize && fileSize > maxSize) {
      const response = NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Generate unique file name to prevent conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600, // 1 hour
    });

    // Log the request for audit purposes
    console.log(`Presigned upload URL generated for file: ${uniqueFileName}, type: ${fileType}`);

    const response = NextResponse.json({
      presignedUrl,
      fileName: uniqueFileName,
      expiresIn: 3600,
      message: 'Presigned upload URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('AWS presigned upload URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned upload URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 