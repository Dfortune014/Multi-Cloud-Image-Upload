import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateAzureEnv = () => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  
  if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure environment variables. Please set AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_STORAGE_CONTAINER_NAME');
  }
  
  return { accountName, accountKey, containerName };
};

// Initialize Azure Blob Service client
let blobServiceClient: BlobServiceClient;
let containerName: string;

try {
  const { accountName, accountKey, containerName: container } = validateAzureEnv();
  containerName = container;
  
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
} catch (error) {
  console.error('Azure Blob Service client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!blobServiceClient || !containerName) {
      const response = NextResponse.json({ 
        error: 'Azure Blob Service client not initialized. Please check environment variables.' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    // Validate required fields
    if (!fileName || !fileType) {
      const response = NextResponse.json({ 
        error: 'Missing required fields: fileName and fileType are required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Generate unique filename to prevent conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(uniqueFileName);

    // Generate SAS URL for upload (write permission)
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: uniqueFileName,
        permissions: BlobSASPermissions.parse("w"), // Write permission
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000), // 1 hour
      },
      blobServiceClient.credential as StorageSharedKeyCredential
    ).toString();

    const presignedUrl = `${blobClient.url}?${sasToken}`;

    // Log the request for audit purposes
    console.log(`Azure presigned upload URL generated for file: ${uniqueFileName}`);

    const response = NextResponse.json({
      presignedUrl,
      fileName: uniqueFileName,
      expiresIn: 3600,
      message: 'Presigned upload URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('Azure presigned upload URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned upload URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 