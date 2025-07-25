# 🚀 Google Cloud Platform (GCP) Implementation Guide

Complete step-by-step guide to implement Google Cloud Storage integration in the Multi-Cloud Image Upload project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [GCP Console Setup](#gcp-console-setup)
3. [Service Account Configuration](#service-account-configuration)
4. [Cloud Storage Setup](#cloud-storage-setup)
5. [Project Implementation](#project-implementation)
6. [Code Implementation](#code-implementation)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

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

### Step 3: Create API Route

Create file: `src/app/api/gcp/route.ts`

```typescript
import { Storage } from '@google-cloud/storage';
import { NextRequest, NextResponse } from 'next/server';

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

// POST: Upload file to GCP Cloud Storage
export async function POST(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload file to GCP
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(file.name);
    
    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    
    return NextResponse.json({ message: 'Upload successful' });
  } catch (err) {
    console.error('GCP upload failed:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// GET: Download file or list all files
export async function GET(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const bucket = storage.bucket(bucketName);
    
    if (key) {
      // Download a file
      try {
        const blob = bucket.file(key);
        const [exists] = await blob.exists();
        
        if (!exists) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        
        // Generate signed URL for download
        const [signedUrl] = await blob.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        
        // Download the file content
        const [fileContent] = await blob.download();
        
        // Get metadata
        const [metadata] = await blob.getMetadata();
        
        return new NextResponse(fileContent, {
          status: 200,
          headers: {
            'Content-Type': metadata.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${key}"`,
          },
        });
      } catch (err) {
        console.error('GCP download failed:', err);
        return NextResponse.json({ 
          error: 'GetFile failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    } else {
      // List all files
      try {
        const [files] = await bucket.getFiles();
        const fileList = files.map(file => ({
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.metadata?.updated,
          contentType: file.metadata?.contentType,
        }));
        
        return NextResponse.json({ files: fileList });
      } catch (err) {
        console.error('GCP list files failed:', err);
        return NextResponse.json({ 
          error: 'ListFiles failed', 
          details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
      }
    }
  } catch (err) {
    console.error('GCP GET failed:', err);
    return NextResponse.json({ 
      error: 'GCP operation failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// DELETE: Remove file from GCP Cloud Storage
export async function DELETE(req: NextRequest) {
  try {
    if (!storage || !bucketName) {
      return NextResponse.json({ 
        error: 'GCP client not initialized. Please check environment variables.' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }
    
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(key);
    
    // Check if file exists
    const [exists] = await blob.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Delete the file
    await blob.delete();
    
    return NextResponse.json({ message: 'Delete successful' });
  } catch (err) {
    console.error('GCP delete failed:', err);
    return NextResponse.json({ 
      error: 'DeleteFile failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
```

### Step 4: Frontend Integration

Update your upload page (`src/app/page.tsx`) to use GCP:

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', 'gcp-storage');

  try {
    const response = await fetch('/api/gcp', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      toast.success('File uploaded successfully!');
    } else {
      toast.error('Upload failed');
    }
  } catch (error) {
    toast.error('Upload failed');
  }
};
```

Update your files page (`src/app/files/page.tsx`) to list GCP files:

```typescript
const loadFiles = async () => {
  try {
    const response = await fetch('/api/gcp');
    if (response.ok) {
      const data = await response.json();
      setFiles(data.files || []);
    }
  } catch (error) {
    console.error('Failed to load files:', error);
  }
};

const handleDeleteFile = async (fileName: string) => {
  try {
    const response = await fetch(`/api/gcp?key=${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      toast.success('File deleted successfully!');
      loadFiles(); // Reload the file list
    } else {
      toast.error('Delete failed');
    }
  } catch (error) {
    toast.error('Delete failed');
  }
};
```

## 🧪 Testing

### Test Upload

```bash
# Start development server
npm run dev

# Navigate to http://localhost:3000
# Select GCP Storage as provider
# Upload an image file
# Check for success notification
```

### Test File Management

```bash
# Navigate to http://localhost:3000/files
# Select GCP Storage provider
# Verify uploaded files appear
# Test download and delete functionality
```

### Verify in GCP Console

1. Go to Cloud Storage Console
2. Navigate to your bucket
3. Confirm files are uploaded correctly
4. Check file permissions and metadata

## 🔧 Troubleshooting

### Common Issues

1. **"Service Account Not Found" Error**
   ```bash
   # Check service account JSON file path
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
   ```

2. **"Bucket Not Found" Error**
   ```bash
   # Verify environment variables:
   GCP_BUCKET_NAME=your-actual-bucket-name
   ```

3. **"Permission Denied" Error**
   ```bash
   # Check service account has these roles:
   - Storage Object Admin
   - Storage Object Viewer
   - Storage Object Creator
   ```

4. **"API Not Enabled" Error**
   ```bash
   # Enable Cloud Storage API in GCP Console
   # Go to APIs & Services → Library → Cloud Storage API
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
```

## 🔒 Security Best Practices

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
- [Service Accounts Best Practices](https://cloud.google.com/iam/docs/service-accounts)
- [Cloud Storage Security](https://cloud.google.com/storage/docs/security)

## 🎯 Next Steps

After implementing GCP Cloud Storage:

1. **Test all functionality** (upload, download, delete, list)
2. **Implement error handling** and user feedback
3. **Add file validation** (size, type, etc.)
4. **Consider implementing** file compression and optimization
5. **Set up monitoring** and logging
6. **Plan for production** deployment

---

**Happy coding! 🚀** 