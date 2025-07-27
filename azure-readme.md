# 🚀 Azure Blob Storage Implementation Guide

Complete step-by-step guide to implement Azure Blob Storage integration with **presigned URLs (SAS)** for enhanced security in the Multi-Cloud Image Upload project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Portal Setup](#azure-portal-setup)
3. [Storage Account Configuration](#storage-account-configuration)
4. [Container Setup](#container-setup)
5. [CORS Configuration](#cors-configuration)
6. [Project Implementation](#project-implementation)
7. [Presigned URL Implementation](#presigned-url-implementation)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

## 🔧 Prerequisites

- Azure account with active subscription
- Node.js 18+ or Bun
- Basic knowledge of Azure services
- Next.js project setup

## ☁️ Azure Portal Setup

### Step 1: Create Storage Account

1. **Sign in to Azure Portal**
   ```bash
   # Navigate to Azure Portal
   https://portal.azure.com/
   ```

2. **Create Storage Account**
   - Search for "Storage accounts" in the search bar
   - Click "Create" → "Storage account"

3. **Configure Storage Account**
   - **Subscription**: Select your subscription
   - **Resource group**: Create new or use existing
   - **Storage account name**: `multiclouduploader` (must be globally unique)
   - **Region**: Choose your preferred region
   - **Performance**: Standard
   - **Redundancy**: Locally-redundant storage (LRS)

4. **Advanced Settings**
   - **Enable hierarchical namespace**: No
   - **Blob public access**: Disabled (for security)
   - **Minimum TLS version**: Version 1.2

5. **Create Account**
   - Click "Review + create" → "Create"

### Step 2: Create Container

1. **Navigate to Storage Account**
   - Go to your storage account
   - Click "Containers" in the left menu

2. **Create Container**
   - Click "+ Container"
   - **Name**: `images`
   - **Public access level**: Private (no anonymous access)
   - Click "Create"

## 🛡️ CORS Configuration

### Step 1: Configure CORS (Critical for Presigned URLs)

**This is essential for presigned URL functionality!**

1. **Navigate to CORS Settings**
   - In your storage account → **Settings** → **Resource sharing (CORS)**
   - Click "Add"

2. **Add CORS Rule**
   ```json
   {
     "AllowedOrigins": [
       "http://localhost:3000",
       "https://localhost:3000",
       "http://localhost:3001",
       "https://localhost:3001",
       "http://127.0.0.1:3000",
       "https://127.0.0.1:3000",
       "http://127.0.0.1:3001",
       "https://127.0.0.1:3001"
     ],
     "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposedHeaders": ["*"],
     "MaxAgeInSeconds": 3600
   }
   ```

3. **Save Configuration**
   - Click "Add" to save the CORS rule

## 🔑 Access Keys Configuration

### Step 1: Get Access Keys

1. **Navigate to Access Keys**
   - In your storage account → **Access keys**
   - Click "Show" next to **key1**

2. **Copy Credentials**
   - **Storage account name**: Your storage account name
   - **Key**: Copy the key value
   - **Connection string**: Copy the connection string

### Step 2: Create Shared Access Signature (Optional)

1. **Navigate to Shared Access Signature**
   - In your storage account → **Shared access signature**

2. **Configure SAS**
   - **Allowed services**: Blob
   - **Allowed resource types**: Container, Object
   - **Allowed permissions**: Read, Write, Delete, List
   - **Start time**: Now
   - **Expiry time**: 1 year from now
   - **Allowed protocols**: HTTPS only

3. **Generate SAS**
   - Click "Generate SAS and connection string"
   - Copy the SAS token

## 📦 Project Implementation

### Step 1: Install Dependencies

```bash
# Install Azure Storage Blob SDK
npm install @azure/storage-blob

# Or with Bun
bun add @azure/storage-blob
```

### Step 2: Environment Variables

Create `.env.local` file in your project root:

```env
# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER_NAME=images
AZURE_STORAGE_SAS_TOKEN=your-sas-token
```

## 🔐 Presigned URL Implementation

### Step 1: Create Presigned Upload API

Create file: `src/app/api/azure/azure-post/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateAzureEnv = () => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  
  if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure environment variables');
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
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!blobServiceClient || !containerName) {
      const response = NextResponse.json({ 
        error: 'Azure Blob Service client not initialized' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      const response = NextResponse.json({ 
        error: 'Missing required fields: fileName and fileType are required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Generate unique filename
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
```

### Step 2: Create Presigned Download API

Create file: `src/app/api/azure/azure-get/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!blobServiceClient || !containerName) {
      const response = NextResponse.json({ 
        error: 'Azure Blob Service client not initialized' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    const body = await req.json();
    const { fileName } = body;

    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(fileName);

    // Generate SAS URL for download (read permission)
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse("r"), // Read permission
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // 15 minutes
      },
      blobServiceClient.credential as StorageSharedKeyCredential
    ).toString();

    const presignedUrl = `${blobClient.url}?${sasToken}`;

    const response = NextResponse.json({
      presignedUrl,
      fileName,
      expiresIn: 900,
      message: 'Presigned download URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('Azure presigned download URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned download URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 3: Create Presigned Delete API

Create file: `src/app/api/azure/azure-delete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!blobServiceClient || !containerName) {
      const response = NextResponse.json({ 
        error: 'Azure Blob Service client not initialized' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    const body = await req.json();
    const { fileName } = body;

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
```

### Step 4: Create Upload Complete API

Create file: `src/app/api/azure/azure-response/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { fileName, fileSize, uploadTime } = body;

    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Log upload completion for audit purposes
    console.log(`Azure upload completed for file: ${fileName}, size: ${fileSize || 'unknown'}, time: ${uploadTime || new Date().toISOString()}`);

    const response = NextResponse.json({
      message: 'Azure upload completion recorded successfully',
      fileName,
      recordedAt: new Date().toISOString()
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('Azure upload completion notification failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to record upload completion', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 5: Create List API

Create file: `src/app/api/azure/azure-list/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function GET(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!blobServiceClient || !containerName) {
      const response = NextResponse.json({ 
        error: 'Azure Blob Service client not initialized' 
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
```

## 🎨 Frontend Integration

### Step 1: Update Upload Page

Update your upload page (`src/app/page.tsx`) to support Azure:

```typescript
const handleUpload = async () => {
  if (!selectedFile) {
    toast.error('Please select an image first')
    return
  }

  setIsUploading(true)
  setUploadResponse(null)

  try {
    // Determine API endpoint based on selected provider
    let apiEndpoint: string;
    let responseEndpoint: string;
    
    switch (cloudProvider) {
      case 'aws-s3':
        apiEndpoint = '/api/aws/aws-post';
        responseEndpoint = '/api/aws/aws-response';
        break;
      case 'azure-blob':
        apiEndpoint = '/api/azure/azure-post';
        responseEndpoint = '/api/azure/azure-response';
        break;
      case 'gcp-storage':
        apiEndpoint = '/api/gcp/gcp-post';
        responseEndpoint = '/api/gcp/gcp-response';
        break;
      default:
        throw new Error('Unsupported cloud provider');
    }

    // Step 1: Get presigned upload URL from backend
    const presignedUrlResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      }),
    });

    if (!presignedUrlResponse.ok) {
      const errorData = await presignedUrlResponse.json();
      throw new Error(errorData.error || 'Failed to get upload URL');
    }

    const { presignedUrl, fileName } = await presignedUrlResponse.json();

    // Step 2: Upload directly to Azure using presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: selectedFile,
      headers: {
        'Content-Type': selectedFile.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to ${getProviderName(cloudProvider)}`);
    }

    // Step 3: Notify backend of successful upload
    await fetch(responseEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileSize: selectedFile.size,
        uploadTime: new Date().toISOString(),
      }),
    });

    const response: UploadResponse = {
      success: true,
      message: `Image uploaded to ${getProviderName(cloudProvider)} successfully!`,
      provider: cloudProvider,
    };
    setUploadResponse(response);
    toast.success(response.message);

    // Clear file after successful upload
    setTimeout(() => {
      setSelectedFile(null);
      setUploadResponse(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);
  } catch (error) {
    const response: UploadResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed due to network error',
      provider: cloudProvider,
    };
    setUploadResponse(response);
    toast.error(response.message);
  } finally {
    setIsUploading(false);
  }
};
```

## 🧪 Testing

### Test Presigned URL Upload

```bash
# Start development server
npm run dev

# Navigate to http://localhost:3000
# Select Azure Blob Storage as provider
# Upload an image file
# Check browser network tab for presigned URL requests
# Verify file appears in Azure container
```

### Test File Management

```bash
# Navigate to http://localhost:3000/files
# Select Azure Blob Storage provider
# Verify uploaded files appear with image previews
# Test download (opens in new tab)
# Test delete functionality
```

### Verify Security

1. **Check Network Tab**
   - No Azure credentials in frontend requests
   - Only SAS URLs are used for direct Azure access
   - All operations go through your backend first

2. **Check Azure Container**
   - Files are uploaded with unique timestamps
   - No public access (private container)
   - CORS properly configured

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Error: "No 'Access-Control-Allow-Origin' header is present"
   # Solution: Update Azure CORS configuration in Resource sharing (CORS)
   ```

2. **SAS URL Expired**
   ```bash
   # Error: "AuthenticationFailed"
   # Solution: URLs expire after configured time (1h upload, 15m download, 5m delete)
   ```

3. **Upload Failures**
   ```bash
   # Check CORS configuration includes your origin
   # Verify storage account permissions
   # Check file size limits (Azure default: 190.7 TB)
   ```

4. **Authentication Errors**
   ```bash
   # Check environment variables are set correctly
   # Verify storage account name and key
   # Ensure container exists and is accessible
   ```

### Debug Commands

```bash
# Check environment variables
echo $AZURE_STORAGE_ACCOUNT_NAME
echo $AZURE_STORAGE_ACCOUNT_KEY
echo $AZURE_STORAGE_CONTAINER_NAME

# Test Azure connection
az storage blob list --container-name your-container-name --account-name your-account-name
```

## 🔒 Security Best Practices

### SAS URL Security

```bash
# ✅ Time-limited access (1h upload, 15m download, 5m delete)
# ✅ Operation-specific permissions (w, r, d)
# ✅ No credentials exposed to frontend
# ✅ CORS properly configured
# ✅ Private container access
```

### Storage Account Security

```bash
# Use least-privilege access
# Regularly rotate access keys
# Enable soft delete for blobs
# Use Azure Key Vault for secrets
# Enable storage account firewall
```

### Environment Variables

```bash
# Never commit .env.local to version control
# Use different credentials for dev/prod
# Consider using Azure Key Vault for production
# Regularly audit access keys
```

## 📚 Additional Resources

- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Storage Blob SDK for JavaScript](https://docs.microsoft.com/en-us/javascript/api/overview/azure/storage-blob-readme)
- [Azure SAS URLs](https://docs.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Azure CORS Configuration](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services)
- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/storage/common/storage-security-guide)

## 🎯 Next Steps

After implementing Azure Blob Storage with presigned URLs:

1. **Test all functionality** (upload, download, delete, list, preview)
2. **Implement for AWS and GCP** using same presigned URL pattern
3. **Add user authentication** and file ownership
4. **Add file metadata** storage in database
5. **Implement file versioning** and backup
6. **Set up monitoring** and audit logging
7. **Plan for production** deployment with proper security

---

**Happy coding! 🚀** 