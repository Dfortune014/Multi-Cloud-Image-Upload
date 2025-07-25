# 🚀 AWS S3 Implementation Guide

Complete step-by-step guide to implement AWS S3 integration in the Multi-Cloud Image Upload project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Console Setup](#aws-console-setup)
3. [IAM Configuration](#iam-configuration)
4. [S3 Bucket Configuration](#s3-bucket-configuration)
5. [Project Implementation](#project-implementation)
6. [Code Implementation](#code-implementation)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

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

### Step 2: Configure CORS

Add this CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

**Steps:**
1. Go to your S3 bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit" and paste the above configuration
4. Click "Save changes"

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

## 📦 Project Implementation

### Step 1: Install Dependencies

```bash
# Install AWS SDK
npm install @aws-sdk/client-s3

# Or with Bun
bun add @aws-sdk/client-s3
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

### Step 3: Create API Route

Create file: `src/app/api/aws/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

// POST: Upload file to S3
export async function POST(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized' 
      }, { status: 500 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadParams = {
      Bucket: bucketName,
      Key: file.name, 
      Body: buffer,
      ContentType: file.type,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    return NextResponse.json({ message: 'Upload successful' });
  } catch (err) {
    console.error('AWS upload failed:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// GET: Download file or list all files
export async function GET(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (key) {
      // Download specific file
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const data = await s3.send(command);
      
      const streamToBuffer = async (stream: any) => {
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: any[] = [];
          stream.on('data', (chunk: any) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      };
      
      const fileBuffer = await streamToBuffer(data.Body);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': data.ContentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${key}"`,
        },
      });
    } else {
      // List all files
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
      });
      const data = await s3.send(command);
      const files = (data.Contents || []).map(obj => ({
        name: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      }));
      return NextResponse.json({ files });
    }
  } catch (err) {
    console.error('AWS GET failed:', err);
    return NextResponse.json({ 
      error: 'AWS operation failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// DELETE: Remove file from S3
export async function DELETE(req: NextRequest) {
  try {
    if (!s3 || !bucketName) {
      return NextResponse.json({ 
        error: 'AWS client not initialized' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3.send(command);
    return NextResponse.json({ message: 'Delete successful' });
  } catch (err) {
    console.error('AWS delete failed:', err);
    return NextResponse.json({ 
      error: 'Delete failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
```

### Step 4: Frontend Integration

Update your upload page (`src/app/page.tsx`) to use AWS:

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', 'aws-s3');

  try {
    const response = await fetch('/api/aws', {
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

Update your files page (`src/app/files/page.tsx`) to list AWS files:

```typescript
const loadFiles = async () => {
  try {
    const response = await fetch('/api/aws');
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
    const response = await fetch(`/api/aws?key=${encodeURIComponent(fileName)}`, {
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
# Select AWS S3 as provider
# Upload an image file
# Check for success notification
```

### Test File Management

```bash
# Navigate to http://localhost:3000/files
# Select AWS S3 provider
# Verify uploaded files appear
# Test download and delete functionality
```

### Verify in AWS Console

1. Go to S3 Console
2. Navigate to your bucket
3. Confirm files are uploaded correctly
4. Check file permissions and metadata

## 🔧 Troubleshooting

### Common Issues

1. **"Access Denied" Error**
   ```bash
   # Check IAM permissions include:
   - s3:PutObject
   - s3:GetObject
   - s3:DeleteObject
   - s3:ListBucket
   ```

2. **"Bucket Not Found" Error**
   ```bash
   # Verify environment variables:
   AWS_S3_BUCKET=your-actual-bucket-name
   AWS_REGION=your-bucket-region
   ```

3. **CORS Errors**
   ```bash
   # Check CORS configuration in S3 bucket
   # Ensure allowed origins include your domain
   ```

4. **Upload Failures**
   ```bash
   # Check file size limits (S3 default: 5GB)
   # Verify network connectivity
   # Check AWS credentials are valid
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
```

## 🔒 Security Best Practices

### IAM Security

```bash
# Use least-privilege access
# Regularly rotate access keys
# Consider using IAM roles for production
# Enable MFA for IAM users
```

### Bucket Security

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicRead",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-xxxxxxxxxx"
        }
      }
    }
  ]
}
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
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## 🎯 Next Steps

After implementing AWS S3:

1. **Test all functionality** (upload, download, delete, list)
2. **Implement error handling** and user feedback
3. **Add file validation** (size, type, etc.)
4. **Consider implementing** file compression and optimization
5. **Set up monitoring** and logging
6. **Plan for production** deployment

---

**Happy coding! 🚀** 