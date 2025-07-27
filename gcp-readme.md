# 🚀 Google Cloud Platform (GCP) Implementation Guide

Complete step-by-step guide to implement Google Cloud Storage integration with **presigned URLs (signed URLs)** for enhanced security in the Multi-Cloud Image Upload project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [GCP Console Setup](#gcp-console-setup)
3. [Service Account Configuration](#service-account-configuration)
4. [Cloud Storage Setup](#cloud-storage-setup)
5. [CORS Configuration](#cors-configuration)
6. [Project Implementation](#project-implementation)
7. [Presigned URL Implementation](#presigned-url-implementation)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

## 🔧 Prerequisites

- Google Cloud Platform account with billing enabled
- Node.js 18+ or Bun
- Basic knowledge of GCP services
- Next.js project setup

## ☁️ GCP Console Setup

### Step 1: Create GCP Project

1. **Sign in to Google Cloud Console**
   ```bash
   # Navigate to GCP Console
   https://console.cloud.google.com/
   ```

2. **Create New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: `cloud-uploader-project`
   - Click "Create"

3. **Enable Billing**
   - Go to Billing in the left menu
   - Link a billing account to your project
   - **Important**: Cloud Storage requires billing to be enabled

### Step 2: Enable Cloud Storage API

1. **Navigate to APIs & Services**
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Storage"
   - Click on "Cloud Storage API"
   - Click "Enable"

### Step 3: Create Cloud Storage Bucket

1. **Navigate to Cloud Storage**
   - Go to "Cloud Storage" → "Buckets"
   - Click "Create Bucket"

2. **Configure Bucket**
   ```bash
   Name: cloud-uploader-bucket
   Location type: Region
   Location: us-central1 (or your preferred region)
   Storage class: Standard
   Access control: Uniform
   Protection tools: None (for development)
   ```

3. **Create Bucket**
   - Click "Create"
   - Note your bucket name and region

## 🔐 Service Account Configuration

### Step 1: Create Service Account

1. **Navigate to IAM & Admin**
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"

2. **Configure Service Account**
   ```bash
   Service account name: cloud-uploader-service
   Service account ID: cloud-uploader-service
   Description: Service account for Cloud Uploader application
   ```

3. **Grant Access**
   - Click "Grant this service account access to project"
   - Add role: "Storage Object Admin"
   - Click "Continue" → "Done"

### Step 2: Create and Download Key

1. **Create Key**
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Click "Create"

2. **Download Key File**
   - The JSON file will download automatically
   - Save it as `gcp-service-account.json` in your project
   - **IMPORTANT**: Keep this file secure and never commit it to version control

### Step 3: Service Account Permissions

The service account should have these roles:
- `Storage Object Admin` - Full access to objects
- `Storage Object Viewer` - Read access to objects
- `Storage Object Creator` - Create objects

## 🛡️ CORS Configuration

### Step 1: Configure CORS (Critical for Presigned URLs)

**This is essential for presigned URL functionality!**

1. **Navigate to Cloud Storage**
   - Go to "Cloud Storage" → "Buckets"
   - Click on your bucket name

2. **Configure CORS**
   - Click on the "CORS" tab
   - Click "Add CORS rule"

3. **Add CORS Rule**
   ```json
   [
     {
       "origin": [
         "http://localhost:3000",
         "https://localhost:3000",
         "http://localhost:3001",
         "https://localhost:3001",
         "http://127.0.0.1:3000",
         "https://127.0.0.1:3000",
         "http://127.0.0.1:3001",
         "https://127.0.0.1:3001"
       ],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

4. **Save Configuration**
   - Click "Save" to apply the CORS rule

## 📦 Project Implementation

### Step 1: Install Dependencies

```bash
# Install Google Cloud Storage SDK
npm install @google-cloud/storage

# Or with Bun
bun add @google-cloud/storage
```

### Step 2: Environment Variables

Create `.env.local` file in your project root:

```env
# GCP Configuration
GCP_BUCKET_NAME=cloud-uploader-bucket
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
```

## 🔐 Presigned URL Implementation

### Step 1: Create Presigned Upload API

Create file: `src/app/api/gcp/gcp-post/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateGcpEnv = () => {
  const bucketName = process.env.GCP_BUCKET_NAME;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!bucketName || !credentialsPath) {
    throw new Error('Missing GCP environment variables. Please set GCP_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS');
  }
  
  return { bucketName, credentialsPath };
};

// Initialize GCP Storage client
let storage: Storage;
let bucketName: string;

try {
  const { bucketName: bucket, credentialsPath } = validateGcpEnv();
  bucketName = bucket;
  storage = new Storage({
    keyFilename: credentialsPath,
  });
} catch (error) {
  console.error('GCP client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!storage || !bucketName) {
      const response = NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
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

    // Get bucket and file reference
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(uniqueFileName);

    // Generate signed URL for upload (write action)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: fileType,
    });

    // Log the request for audit purposes
    console.log(`GCP presigned upload URL generated for file: ${uniqueFileName}`);

    const response = NextResponse.json({
      presignedUrl: signedUrl,
      fileName: uniqueFileName,
      expiresIn: 3600,
      message: 'Presigned upload URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP presigned upload URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned upload URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 2: Create Presigned Download API

Create file: `src/app/api/gcp/gcp-get/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!storage || !bucketName) {
      const response = NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
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

    // Get bucket and file reference
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Generate signed URL for download (read action)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // Log the request for audit purposes
    console.log(`GCP presigned download URL generated for file: ${fileName}`);

    const response = NextResponse.json({
      presignedUrl: signedUrl,
      fileName,
      expiresIn: 900,
      message: 'Presigned download URL generated successfully'
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP presigned download URL generation failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned download URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 3: Create Presigned Delete API

Create file: `src/app/api/gcp/gcp-delete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!storage || !bucketName) {
      const response = NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
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

    // Get bucket and file reference
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Generate signed URL for delete action
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'delete',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Log the request for audit purposes
    console.log(`GCP presigned delete URL generated for file: ${fileName}`);

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
```

### Step 4: Create Upload Complete API

Create file: `src/app/api/gcp/gcp-response/route.ts`

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
    console.log(`GCP upload completed for file: ${fileName}, size: ${fileSize || 'unknown'}, time: ${uploadTime || new Date().toISOString()}`);

    const response = NextResponse.json({
      message: 'GCP upload completion recorded successfully',
      fileName,
      recordedAt: new Date().toISOString()
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP upload completion notification failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to record upload completion', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 5: Create List API

Create file: `src/app/api/gcp/gcp-list/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// ... (same initialization code as above) ...

export async function GET(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!storage || !bucketName) {
      const response = NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    // Get bucket and list files
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();
    
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
```

## 🎨 Frontend Integration

### Step 1: Update Upload Page

Update your upload page (`src/app/page.tsx`) to support GCP:

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

    // Step 2: Upload directly to GCP using presigned URL
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
# Select GCP Cloud Storage as provider
# Upload an image file
# Check browser network tab for presigned URL requests
# Verify file appears in GCP bucket
```

### Test File Management

```bash
# Navigate to http://localhost:3000/files
# Select GCP Cloud Storage provider
# Verify uploaded files appear with image previews
# Test download (opens in new tab)
# Test delete functionality
```

### Verify Security

1. **Check Network Tab**
   - No GCP credentials in frontend requests
   - Only signed URLs are used for direct GCP access
   - All operations go through your backend first

2. **Check GCP Bucket**
   - Files are uploaded with unique timestamps
   - No public access (uniform bucket-level access)
   - CORS properly configured

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Error: "No 'Access-Control-Allow-Origin' header is present"
   # Solution: Update GCP CORS configuration in bucket settings
   ```

2. **Signed URL Expired**
   ```bash
   # Error: "Access denied"
   # Solution: URLs expire after configured time (1h upload, 15m download, 5m delete)
   ```

3. **Upload Failures**
   ```bash
   # Check CORS configuration includes your origin
   # Verify service account permissions
   # Check file size limits (GCP default: 5 TB)
   ```

4. **Authentication Errors**
   ```bash
   # Check environment variables are set correctly
   # Verify service account JSON file path
   # Ensure bucket exists and is accessible
   ```

### Debug Commands

```bash
# Check environment variables
echo $GCP_BUCKET_NAME
echo $GOOGLE_APPLICATION_CREDENTIALS

# Test GCP authentication
gcloud auth application-default login

# List GCP buckets
gsutil ls

# Test bucket access
gsutil ls gs://your-bucket-name
```

## 🔒 Security Best Practices

### Signed URL Security

```bash
# ✅ Time-limited access (1h upload, 15m download, 5m delete)
# ✅ Operation-specific permissions (write, read, delete)
# ✅ No credentials exposed to frontend
# ✅ CORS properly configured
# ✅ Uniform bucket-level access
```

### Service Account Security

```bash
# Use least-privilege access
# Regularly rotate service account keys
# Consider using Workload Identity for production
# Enable audit logging
```

### Bucket Security

```bash
# Set up bucket IAM policies
# Enable object versioning for important files
# Configure lifecycle policies
# Set up monitoring and alerting
```

### Environment Variables

```bash
# Never commit service account JSON to version control
# Use different service accounts for dev/prod
# Consider using Secret Manager for production
# Regularly audit service account permissions
```

## 📚 Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Node.js Client Library](https://cloud.google.com/storage/docs/reference/libraries)
- [Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [CORS Configuration](https://cloud.google.com/storage/docs/cross-origin)
- [Service Accounts Best Practices](https://cloud.google.com/iam/docs/service-accounts)
- [Cloud Storage Security](https://cloud.google.com/storage/docs/security)

## 🎯 Next Steps

After implementing GCP Cloud Storage with presigned URLs:

1. **Test all functionality** (upload, download, delete, list, preview)
2. **Implement for AWS and Azure** using same presigned URL pattern
3. **Add user authentication** and file ownership
4. **Add file metadata** storage in database
5. **Implement file versioning** and backup
6. **Set up monitoring** and audit logging
7. **Plan for production** deployment with proper security

---

**Happy coding! 🚀** 