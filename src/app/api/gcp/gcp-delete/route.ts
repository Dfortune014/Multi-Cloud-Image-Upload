import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateGcpEnv = () => {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const bucketName = process.env.GCP_STORAGE_BUCKET;
  
  if (!projectId || !credentialsPath || !bucketName) {
    throw new Error('Missing GCP environment variables. Please set GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS, and GCP_STORAGE_BUCKET');
  }
  
  return { projectId, credentialsPath, bucketName };
};

// Initialize GCP Storage client
let storage: Storage;
let bucketName: string;

try {
  const { projectId, credentialsPath, bucketName: bucket } = validateGcpEnv();
  bucketName = bucket;
  storage = new Storage({
    projectId,
    keyFilename: credentialsPath,
  });
} catch (error) {
  console.error('GCP Storage client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!storage || !bucketName) {
      const response = NextResponse.json({ 
        error: 'GCP Storage client not initialized. Please check environment variables.' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    const body = await req.json();
    const { fileName } = body;

    // Validate required fields
    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Get bucket and file reference
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Generate signed URL for delete operation
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'delete',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Log the request for audit purposes
    console.log(`Presigned delete URL generated for file: ${fileName}`);

    const response = NextResponse.json({
      presignedUrl: signedUrl,
      fileName,
      expiresIn: 300,
      message: 'Presigned delete URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP presigned delete URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned delete URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 