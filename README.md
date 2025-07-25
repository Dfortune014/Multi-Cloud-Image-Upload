# 🌤️ CloudUploader - Multi-Cloud Image Upload

A modern, responsive web application for uploading and managing images across multiple cloud storage providers: **AWS S3**, **Azure Blob Storage**, and **Google Cloud Platform (GCP) Cloud Storage**.

![CloudUploader](https://img.shields.io/badge/Next.js-15.3.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css)

## 📍 Repository

🔗 **GitHub Repository**: [https://github.com/Dfortune014/Multi-Cloud-Image-Upload](https://github.com/Dfortune014/Multi-Cloud-Image-Upload)

## ✨ Features

- **🔄 Multi-Cloud Support**: Upload to AWS S3, Azure Blob Storage, or GCP Cloud Storage
- **📱 Responsive Design**: Beautiful UI that works on desktop and mobile
- **🖼️ Image Preview**: Automatic image thumbnails with fallback icons
- **🗂️ File Management**: View, download, and delete files from any cloud provider
- **📄 Pagination**: Efficient file browsing with pagination support
- **🎨 Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **⚡ Real-time Feedback**: Toast notifications for all operations
- **🔒 Secure**: Environment-based configuration for cloud credentials

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Cloud storage accounts (AWS S3, Azure Blob Storage, and/or GCP Cloud Storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dfortune014/Multi-Cloud-Image-Upload.git
   cd Multi-Cloud-Image-Upload
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # AWS S3 Configuration
   AWS_REGION=your-aws-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET=your-bucket-name

   # Azure Blob Storage Configuration
   AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
   AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
   AZURE_CONTAINER_NAME=your-container-name

   # Google Cloud Platform Configuration
   GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
   GCP_BUCKET_NAME=your-gcp-bucket-name
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
Multi-Cloud-Image-Upload/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── aws/route.ts          # AWS S3 API endpoints
│   │   │   ├── azure/route.ts        # Azure Blob Storage API endpoints
│   │   │   └── gcp/route.ts          # GCP Cloud Storage API endpoints
│   │   ├── files/
│   │   │   ├── page.tsx              # File management page
│   │   │   └── layout.tsx            # Files page layout
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Upload page
│   │   └── globals.css               # Global styles
│   ├── components/
│   │   ├── navigation.tsx            # Navigation component
│   │   └── ui/                       # shadcn/ui components
│   └── lib/
│       ├── file-storage.ts           # File storage utilities
│       └── utils.ts                  # Utility functions
├── .env.local                        # Environment variables
└── README.md                         # This file
```

## 📚 Detailed Documentation

For comprehensive setup guides and implementation details for each cloud provider, check out our detailed documentation:

### 🔗 Cloud Provider Documentation

- **[AWS S3 Implementation Guide](aws-readme.md)** - Complete step-by-step guide for AWS S3 setup and integration
- **[Azure Blob Storage Implementation Guide](azure-readme.md)** - Detailed Azure Blob Storage configuration and implementation
- **[Google Cloud Platform Implementation Guide](gcp-readme.md)** - Comprehensive GCP Cloud Storage setup and integration

Each guide includes:
- ✅ **Console setup instructions** with screenshots
- ✅ **Complete code implementations** with actual project code
- ✅ **Environment variable configurations**
- ✅ **Frontend integration examples**
- ✅ **Testing procedures**
- ✅ **Troubleshooting guides**
- ✅ **Security best practices**
- ✅ **Additional resources and next steps**

## ☁️ Cloud Provider Setup

### Quick Setup Overview

Below are the basic setup steps for each cloud provider. For detailed instructions, please refer to the individual documentation files above.

#### AWS S3 Setup

1. **Create an S3 bucket**
   - Go to AWS S3 Console
   - Create a new bucket
   - Note the bucket name and region

2. **Create IAM user**
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach the `AmazonS3FullAccess` policy (or create a custom policy with specific permissions)

3. **Get credentials**
   - Note the Access Key ID and Secret Access Key
   - Add them to your `.env.local` file

**📖 [View Complete AWS Setup Guide](aws-readme.md)**

#### Azure Blob Storage Setup

1. **Create a storage account**
   - Go to Azure Portal
   - Create a new storage account
   - Note the account name

2. **Create a container**
   - In your storage account, create a new blob container
   - Note the container name

3. **Get access key**
   - Go to "Access keys" in your storage account
   - Copy the key1 or key2
   - Add to your `.env.local` file

**📖 [View Complete Azure Setup Guide](azure-readme.md)**

#### Google Cloud Platform Setup

1. **Create a project**
   - Go to Google Cloud Console
   - Create a new project or select existing one

2. **Enable Cloud Storage API**
   - Go to APIs & Services > Library
   - Search for "Cloud Storage" and enable it

3. **Create service account**
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download the JSON key file

4. **Set up bucket**
   - Go to Cloud Storage
   - Create a new bucket
   - Note the bucket name

5. **Configure credentials**
   - Place the JSON key file in your project
   - Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env.local`

**📖 [View Complete GCP Setup Guide](gcp-readme.md)**

## 🎯 Usage

### Uploading Images

1. **Navigate to the upload page** (`/`)
2. **Select a cloud provider** (AWS S3, Azure Blob, or GCP Storage)
3. **Choose an image file** (supports common image formats)
4. **Click "Upload Image"**
5. **Wait for confirmation** - you'll see a success toast notification

### Managing Files

1. **Go to the files page** (`/files`)
2. **Switch between cloud providers** using the provider selector
3. **View your uploaded images** with automatic thumbnails
4. **Use pagination** to browse through large file collections
5. **View full-size images** by clicking the eye icon
6. **Delete files** using the trash icon

## 🔧 API Endpoints

### AWS S3 (`/api/aws`)
- `POST` - Upload file to S3
- `GET` - Download file or list all files
- `DELETE` - Delete file from S3

### Azure Blob Storage (`/api/azure`)
- `POST` - Upload file to Azure Blob
- `GET` - Download file or list all blobs
- `DELETE` - Delete blob from Azure

### GCP Cloud Storage (`/api/gcp`)
- `POST` - Upload file to GCP Cloud Storage
- `GET` - Download file (with signed URLs) or list all files
- `DELETE` - Delete file from GCP

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Format code
npm run format
```

### Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Cloud Storage**: 
  - AWS SDK v3 for S3
  - Azure Storage Blob SDK
  - Google Cloud Storage SDK
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Code Quality**: Biome, ESLint

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Add environment variables** in Vercel dashboard
4. **Deploy**

### Netlify

1. **Build the project**: `npm run build`
2. **Deploy to Netlify** using the `netlify.toml` configuration

### Other Platforms

The app can be deployed to any platform that supports Next.js applications.

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **IAM Permissions**: Use least-privilege access for cloud services
- **CORS**: Configure CORS settings in your cloud storage buckets if needed
- **File Validation**: The app validates file types on both client and server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your environment variables are set correctly
3. Ensure your cloud storage permissions are configured properly
4. Check the network tab for API call failures

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Cloud storage SDKs from AWS, Microsoft, and Google

---

**Happy uploading! 🚀**
git config --global user.name "Fortune Linus"
git config --global user.email "linusfortune54@gmail.com"