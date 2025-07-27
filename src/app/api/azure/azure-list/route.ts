import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
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

export async function GET(req: NextRequest) {
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

    // Get container client and list blobs
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const fileList = [];

    // List all blobs in the container
    for await (const blob of containerClient.listBlobsFlat()) {
      fileList.push({
        name: blob.name,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
      });
    }

    // Log the request for audit purposes
    console.log(`Listed ${fileList.length} files from Azure container`);

    const response = NextResponse.json({ files: fileList });
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('Azure list files failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to list files', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 