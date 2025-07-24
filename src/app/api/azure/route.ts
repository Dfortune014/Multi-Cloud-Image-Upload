import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { NextRequest, NextResponse } from 'next/server';

// Validate environment variables
const validateAzureEnv = () => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_CONTAINER_NAME;
  
  if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure environment variables. Please set AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_CONTAINER_NAME');
  }
  
  return { accountName, accountKey, containerName };
};

// Initialize Azure client with validation
let blobServiceClient: BlobServiceClient;
try {
  const { accountName, accountKey } = validateAzureEnv();
  blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new StorageSharedKeyCredential(accountName, accountKey)
  );
} catch (error) {
  console.error('Azure client initialization failed:', error);
  // We'll handle this in the route handlers
}

export const uploadToAzure = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> => {
  if (!blobServiceClient) {
    throw new Error('Azure client not initialized. Check environment variables.');
  }
  
  const { containerName } = validateAzureEnv();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return blockBlobClient.url; // URL to access (if public/SAS)
};

export async function POST(req: NextRequest) {
  try {
    if (!blobServiceClient) {
      return NextResponse.json({ 
        error: 'Azure client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await uploadToAzure(buffer, file.name, file.type);
    return NextResponse.json({ message: 'Upload successful' });
  } catch (err) {
    console.error('Azure upload failed:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!blobServiceClient) {
      return NextResponse.json({ 
        error: 'Azure client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const { containerName } = validateAzureEnv();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    if (key) {
      // Download a blob
      try {
        const blobClient = containerClient.getBlobClient(key);
        const downloadBlockBlobResponse = await blobClient.download();
        const stream = downloadBlockBlobResponse.readableStreamBody;
        if (!stream) throw new Error('No stream returned');
        // Convert stream to buffer
        const streamToBuffer = async (readableStream: NodeJS.ReadableStream) => {
          return new Promise<Buffer>((resolve, reject) => {
            const chunks: any[] = [];
            readableStream.on('data', (data) => chunks.push(data));
            readableStream.on('end', () => resolve(Buffer.concat(chunks)));
            readableStream.on('error', reject);
          });
        };
        const fileBuffer = await streamToBuffer(stream);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': downloadBlockBlobResponse.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${key}"`,
          },
        });
      } catch (err) {
        console.error('Azure download failed:', err);
        return NextResponse.json({ 
          error: 'GetBlob failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    } else {
      // List all blobs
      try {
        const iter = containerClient.listBlobsFlat();
        const files = [];
        for await (const blob of iter) {
          files.push({
            name: blob.name,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
          });
        }
        return NextResponse.json({ files });
      } catch (err) {
        console.error('Azure list blobs failed:', err);
        return NextResponse.json({ 
          error: 'ListBlobs failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    }
  } catch (err) {
    console.error('Azure GET failed:', err);
    return NextResponse.json({ 
      error: 'Azure operation failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!blobServiceClient) {
      return NextResponse.json({ 
        error: 'Azure client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }
    
    const { containerName } = validateAzureEnv();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(key);
    await blobClient.delete();
    return NextResponse.json({ message: 'Delete successful' });
  } catch (err) {
    console.error('Azure delete failed:', err);
    return NextResponse.json({ 
      error: 'DeleteBlob failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
