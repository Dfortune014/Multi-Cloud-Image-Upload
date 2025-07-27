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
    const { fileName } = body;

    // Validate required fields
    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(fileName);

    // Generate SAS URL for delete operation
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse("d"), // Delete permission
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 5 * 60 * 1000), // 5 minutes
      },
      blobServiceClient.credential as StorageSharedKeyCredential
    ).toString();

    const presignedUrl = `${blobClient.url}?${sasToken}`;

    // Log the request for audit purposes
    console.log(`Azure presigned delete URL generated for file: ${fileName}`);

    const response = NextResponse.json({
      presignedUrl,
      fileName,
      expiresIn: 300,
      message: 'Presigned delete URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('Azure presigned delete URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned delete URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 