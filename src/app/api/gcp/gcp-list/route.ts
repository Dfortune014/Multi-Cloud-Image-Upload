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

export async function GET(req: NextRequest) {
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

    // Get bucket and list files
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();

    // Map files to consistent format
    const fileList = files.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      lastModified: file.metadata?.updated || new Date().toISOString(),
    }));

    // Log the request for audit purposes
    console.log(`Listed ${fileList.length} files from GCP bucket`);

    const response = NextResponse.json({ files: fileList });
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP list files failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to list files', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 