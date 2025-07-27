# 🚀 AWS S3 Implementation Guide

Complete step-by-step guide to implement AWS S3 integration with **presigned URLs** for enhanced security in the Multi-Cloud Image Upload project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Console Setup](#aws-console-setup)
3. [IAM Configuration](#iam-configuration)
4. [S3 Bucket Configuration](#s3-bucket-configuration)
5. [CORS Configuration](#cors-configuration)
6. [Project Implementation](#project-implementation)
7. [Presigned URL Implementation](#presigned-url-implementation)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

## 🔧 Prerequisites

- AWS Account with billing enabled
- Node.js 18+ or Bun
- Basic knowledge of AWS services
- Next.js project setup

## ☁️ AWS Console Setup

### Step 1: Create S3 Bucket

1. **Sign in to AWS Console**
   ```bash
   # Navigate to AWS Console
   https://console.aws.amazon.com/
   ```

2. **Create S3 Bucket**
   - Search for "S3" in services
   - Click "Create bucket"
   - Enter unique bucket name: `my-cloud-uploader-bucket`
   - Select region: `us-east-1` (or your preferred region)
   - Keep default settings for security
   - Click "Create bucket"

## 🔐 IAM Configuration

### Step 1: Create IAM User

1. **Navigate to IAM**
   - Search for "IAM" in AWS Console
   - Click "Users" → "Create user"

2. **User Configuration**
   ```bash
   Username: cloud-uploader-user
   Access type: Programmatic access
   ```

3. **Attach Permissions**
   - Choose "Attach policies directly"
   - Search and select "AmazonS3FullAccess"
   - Click "Next" → "Create user"

### Step 2: Save Credentials

**IMPORTANT:** Save these credentials securely (you won't see the secret key again):

```bash
Access Key ID: AKIA...
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Step 3: Custom IAM Policy (Optional)

For better security, create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## 🛡️ S3 Bucket Configuration

### Step 1: Configure CORS (Critical for Presigned URLs)

**This is essential for presigned URL functionality!**

1. **Navigate to S3 Bucket**
   - Go to your S3 bucket in AWS Console
   - Click on the **"Permissions"** tab
   - Scroll down to **"Cross-origin resource sharing (CORS)"**
   - Click **"Edit"**

2. **Add CORS Configuration**
   Replace the existing configuration with this comprehensive CORS policy:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
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
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Save Changes**
   - Click **"Save changes"**
   - You should see a success message

### Step 2: Block Public Access (Recommended)

1. **In the same Permissions tab**
   - Scroll to **"Block public access (bucket settings)"**
   - Click **"Edit"**
   - Ensure all options are **checked** (blocked)
   - Click **"Save changes"**

## 📦 Project Implementation

### Step 1: Install Dependencies

```bash
# Install AWS SDK and presigned URL support
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Or with Bun
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Environment Variables

Create `.env.local` file in your project root:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=my-cloud-uploader-bucket
```

### Step 3: Create CORS Utility

Create file: `src/lib/cors.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const corsConfig = {
  allowedOrigins: [
    'http://localhost:3000', 'https://localhost:3000',
    'http://localhost:3001', 'https://localhost:3001',
    'http://127.0.0.1:3000', 'https://127.0.0.1:3000',
    'http://127.0.0.1:3001', 'https://127.0.0.1:3001',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

export function corsMiddleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    const response = new NextResponse(null, { status: 200 });
    
    if (origin && corsConfig.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(','));
    response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(','));
    response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
    
    return response;
  }
  
  return null;
}

export function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}
```

## 🔐 Presigned URL Implementation

### Step 1: Create Presigned Upload API

Create file: `src/app/api/aws/presigned-upload/route.ts`

```typescript
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
    throw new Error('Missing AWS environment variables');
  }
  
  return { region, accessKeyId, secretAccessKey, bucketName };
};

// Initialize S3 client
let s3: S3Client;
let bucketName: string;

try {
  const { region, accessKeyId, secretAccessKey, bucketName: bucket } = validateAwsEnv();
  bucketName = bucket;
  s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
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
        error: 'AWS client not initialized' 
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

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { 
      expiresIn: 3600 // 1 hour
    });

    const response = NextResponse.json({ 
      presignedUrl, 
      fileName: uniqueFileName, 
      expiresIn: 3600,
      message: 'Presigned upload URL generated successfully' 
    });
    
    return addCorsHeaders(response, req);
  } catch (err) {
    console.error('Failed to generate presigned upload URL:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned upload URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 2: Create Presigned Download API

Create file: `src/app/api/aws/presigned-download/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateAwsEnv = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET;
  
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing AWS environment variables');
  }
  
  return { region, accessKeyId, secretAccessKey, bucketName };
};

// Initialize S3 client
let s3: S3Client;
let bucketName: string;

try {
  const { region, accessKeyId, secretAccessKey, bucketName: bucket } = validateAwsEnv();
  bucketName = bucket;
  s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
} catch (error) {
  console.error('AWS client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!s3 || !bucketName) {
      const response = NextResponse.json({ 
        error: 'AWS client not initialized' 
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

    // Create presigned URL for GET operation
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    const presignedUrl = await getSignedUrl(s3, command, { 
      expiresIn: 900 // 15 minutes
    });

    const response = NextResponse.json({ 
      presignedUrl, 
      fileName, 
      expiresIn: 900,
      message: 'Presigned download URL generated successfully' 
    });
    
    return addCorsHeaders(response, req);
  } catch (err) {
    console.error('Failed to generate presigned download URL:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned download URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 3: Create Presigned Delete API

Create file: `src/app/api/aws/presigned-delete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateAwsEnv = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET;
  
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing AWS environment variables');
  }
  
  return { region, accessKeyId, secretAccessKey, bucketName };
};

// Initialize S3 client
let s3: S3Client;
let bucketName: string;

try {
  const { region, accessKeyId, secretAccessKey, bucketName: bucket } = validateAwsEnv();
  bucketName = bucket;
  s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
} catch (error) {
  console.error('AWS client initialization failed:', error);
}

export async function POST(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!s3 || !bucketName) {
      const response = NextResponse.json({ 
        error: 'AWS client not initialized' 
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

    // Create presigned URL for DELETE operation
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    const presignedUrl = await getSignedUrl(s3, command, { 
      expiresIn: 300 // 5 minutes
    });

    const response = NextResponse.json({ 
      presignedUrl, 
      fileName, 
      expiresIn: 300,
      message: 'Presigned delete URL generated successfully' 
    });
    
    return addCorsHeaders(response, req);
  } catch (err) {
    console.error('Failed to generate presigned delete URL:', err);
    const response = NextResponse.json({ 
      error: 'Failed to generate presigned delete URL', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 4: Create Upload Complete API

Create file: `src/app/api/aws/upload-complete/route.ts`

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

    // Log upload completion (can be extended for database updates)
    console.log(`Upload completed for file: ${fileName}, size: ${fileSize || 'unknown'}, time: ${uploadTime || new Date().toISOString()}`);

    const response = NextResponse.json({ 
      message: 'Upload completion recorded successfully', 
      fileName, 
      recordedAt: new Date().toISOString() 
    });
    
    return addCorsHeaders(response, req);
  } catch (err) {
    console.error('Failed to record upload completion:', err);
    const response = NextResponse.json({ 
      error: 'Failed to record upload completion', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
}
```

### Step 5: Create File List API

Create file: `src/app/api/aws/list/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

// Validate environment variables
const validateAwsEnv = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET;
  
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing AWS environment variables');
  }
  
  return { region, accessKeyId, secretAccessKey, bucketName };
};

// Initialize S3 client
let s3: S3Client;
let bucketName: string;

try {
  const { region, accessKeyId, secretAccessKey, bucketName: bucket } = validateAwsEnv();
  bucketName = bucket;
  s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
} catch (error) {
  console.error('AWS client initialization failed:', error);
}

export async function GET(req: NextRequest) {
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    if (!s3 || !bucketName) {
      const response = NextResponse.json({ 
        error: 'AWS client not initialized' 
      }, { status: 500 });
      return addCorsHeaders(response, req);
    }

    // List all files in bucket
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const data = await s3.send(command);
    const files = (data.Contents || []).map(obj => ({
      name: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    const response = NextResponse.json({ files });
    return addCorsHeaders(response, req);
  } catch (err) {
    console.error('Failed to list files:', err);
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

Update your upload page (`src/app/page.tsx`) to use presigned URLs:

```typescript
const handleUpload = async () => {
  if (!selectedFile) {
    toast.error('Please select a file first');
    return;
  }

  setIsUploading(true);
  setUploadResponse(null);

  try {
    // Step 1: Get presigned upload URL
    const presignedUrlResponse = await fetch('/api/aws/presigned-upload', {
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
      throw new Error('Failed to get presigned upload URL');
    }

    const { presignedUrl, fileName } = await presignedUrlResponse.json();

    // Step 2: Upload directly to S3 using presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: selectedFile,
      headers: {
        'Content-Type': selectedFile.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    // Step 3: Notify backend of successful upload
    await fetch('/api/aws/upload-complete', {
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

    // Reset form after 3 seconds
    setTimeout(() => {
      setSelectedFile(null);
      setUploadResponse(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);
  } catch (error) {
    console.error('Upload failed:', error);
    const response: UploadResponse = {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: cloudProvider,
    };
    setUploadResponse(response);
    toast.error(response.message);
  } finally {
    setIsUploading(false);
  }
};
```

### Step 2: Update Files Page

Update your files page (`src/app/files/page.tsx`) to use presigned URLs:

```typescript
// Load files from S3
const loadFiles = async () => {
  setIsLoading(true);
  try {
    const response = await fetch('/api/aws/list');
    if (response.ok) {
      const data = await response.json();
      setFiles(data.files || []);
    } else {
      toast.error('Failed to load files');
    }
  } catch (error) {
    console.error('Failed to load files:', error);
    toast.error('Failed to load files');
  } finally {
    setIsLoading(false);
  }
};

// Delete file using presigned URL
const handleDeleteFile = async (fileName: string) => {
  setDeletingFile(fileName);
  try {
    // Step 1: Get presigned delete URL
    const presignedUrlResponse = await fetch('/api/aws/presigned-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!presignedUrlResponse.ok) {
      throw new Error('Failed to get presigned delete URL');
    }

    const { presignedUrl } = await presignedUrlResponse.json();

    // Step 2: Delete directly from S3 using presigned URL
    const deleteResponse = await fetch(presignedUrl, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete file from S3');
    }

    toast.success(`"${fileName}" deleted successfully`);
    loadFiles(); // Reload the file list
  } catch (error) {
    console.error('Delete failed:', error);
    toast.error(`Failed to delete "${fileName}"`);
  } finally {
    setDeletingFile(null);
  }
};

// View file using presigned URL
const handleViewFile = async (fileName: string) => {
  try {
    // Step 1: Get presigned download URL
    const presignedUrlResponse = await fetch('/api/aws/presigned-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName }),
    });

    if (!presignedUrlResponse.ok) {
      throw new Error('Failed to get presigned download URL');
    }

    const { presignedUrl } = await presignedUrlResponse.json();

    // Step 2: Open file in new tab
    window.open(presignedUrl, '_blank');
  } catch (error) {
    console.error('View failed:', error);
    toast.error(`Failed to view "${fileName}"`);
  }
};

// Image Preview Component for async loading
const ImagePreview = ({ fileName }: { fileName: string }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const presignedUrlResponse = await fetch('/api/aws/presigned-download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileName }),
        });

        if (!presignedUrlResponse.ok) {
          throw new Error('Failed to get preview URL');
        }

        const { presignedUrl } = await presignedUrlResponse.json();
        setImageUrl(presignedUrl);
      } catch (error) {
        console.error('Error loading image:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [fileName]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={fileName} 
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
};
```

## 🧪 Testing

### Test Presigned URL Upload

```bash
# Start development server
npm run dev

# Navigate to http://localhost:3000
# Select AWS S3 as provider
# Upload an image file
# Check browser network tab for presigned URL requests
# Verify file appears in S3 bucket
```

### Test File Management

```bash
# Navigate to http://localhost:3000/files
# Select AWS S3 provider
# Verify uploaded files appear with image previews
# Test download (opens in new tab)
# Test delete functionality
```

### Verify Security

1. **Check Network Tab**
   - No AWS credentials in frontend requests
   - Only presigned URLs are used for direct S3 access
   - All operations go through your backend first

2. **Check S3 Bucket**
   - Files are uploaded with unique timestamps
   - No public access (blocked)
   - CORS properly configured

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Error: "No 'Access-Control-Allow-Origin' header is present"
   # Solution: Update S3 CORS configuration in Permissions tab
   ```

2. **Presigned URL Expired**
   ```bash
   # Error: "The request signature we calculated does not match"
   # Solution: URLs expire after configured time (1h upload, 15m download, 5m delete)
   ```

3. **Upload Failures**
   ```bash
   # Check CORS configuration includes your origin
   # Verify IAM permissions include s3:PutObject
   # Check file size limits (S3 default: 5GB)
   ```

4. **Image Preview Not Loading**
   ```bash
   # Check browser console for errors
   # Verify presigned download URL generation
   # Check file type is supported image format
   ```

### Debug Commands

```bash
# Check environment variables
echo $AWS_REGION
echo $AWS_ACCESS_KEY_ID
echo $AWS_S3_BUCKET

# Test AWS credentials
aws sts get-caller-identity

# List S3 buckets
aws s3 ls

# Check CORS configuration
aws s3api get-bucket-cors --bucket your-bucket-name
```

## 🔒 Security Best Practices

### Presigned URL Security

```bash
# ✅ Time-limited access (1h upload, 15m download, 5m delete)
# ✅ Operation-specific permissions (PUT, GET, DELETE)
# ✅ No credentials exposed to frontend
# ✅ CORS properly configured
# ✅ Bucket public access blocked
```

### IAM Security

```bash
# Use least-privilege access
# Regularly rotate access keys
# Consider using IAM roles for production
# Enable MFA for IAM users
```

### Environment Variables

```bash
# Never commit .env.local to version control
# Use different credentials for dev/prod
# Consider using AWS Secrets Manager for production
# Regularly audit access keys
```

## 📚 Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## 🎯 Next Steps

After implementing AWS S3 with presigned URLs:

1. **Test all functionality** (upload, download, delete, list, preview)
2. **Implement for Azure and GCP** using same presigned URL pattern
3. **Add user authentication** and file ownership
4. **Add file metadata** storage in database
5. **Implement file versioning** and backup
6. **Set up monitoring** and audit logging
7. **Plan for production** deployment with proper security

---

**Happy coding! 🚀** 