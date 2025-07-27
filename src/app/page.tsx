'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Navigation } from '@/components/navigation'
import { FileStorage, type StoredFile } from '@/lib/file-storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Upload, Cloud, CheckCircle, AlertCircle, Loader2, ImageIcon, Files } from 'lucide-react'
import Link from 'next/link'

type CloudProvider = 'aws-s3' | 'azure-blob' | 'gcp-storage'

interface UploadResponse {
  success: boolean
  message: string
  provider?: CloudProvider
  file?: StoredFile
}

export default function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('aws-s3')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setUploadResponse(null)
      } else {
        toast.error('Please select an image file')
      }
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setUploadResponse(null)
      } else {
        toast.error('Please select an image file')
      }
    }
  }

  const getProviderName = (provider: CloudProvider): string => {
    switch (provider) {
      case 'aws-s3': return 'AWS S3'
      case 'azure-blob': return 'Azure Blob Storage'
      case 'gcp-storage': return 'GCP Cloud Storage'
    }
  }

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
        case 'gcp-storage':
          apiEndpoint = '/api/gcp/gcp-post';
          responseEndpoint = '/api/gcp/gcp-response';
          break;
        case 'azure-blob':
          apiEndpoint = '/api/azure/azure-post';
          responseEndpoint = '/api/azure/azure-response';
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

      // Step 2: Upload directly to cloud storage using presigned URL
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
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadResponse(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Multi-Cloud Image Uploader
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Upload images to AWS, Azure, or GCP with one click
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Image Upload
              </CardTitle>
              <CardDescription>
                Select an image and choose your preferred cloud storage provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Upload Section */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Choose Image</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="max-h-48 max-w-full rounded-lg shadow-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFile}
                        >
                          Choose Different Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                          Drag & drop your image here
                        </p>
                        <p className="text-slate-500 mb-4">or</p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              {/* Cloud Provider Selector */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Cloud Storage Provider</Label>
                <RadioGroup
                  value={cloudProvider}
                  onValueChange={(value) => setCloudProvider(value as CloudProvider)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <RadioGroupItem value="aws-s3" id="aws-s3" />
                    <Label htmlFor="aws-s3" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">AWS S3</span>
                        <Badge variant="secondary">Amazon</Badge>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <RadioGroupItem value="azure-blob" id="azure-blob" />
                    <Label htmlFor="azure-blob" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Azure Blob Storage</span>
                        <Badge variant="secondary">Microsoft</Badge>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <RadioGroupItem value="gcp-storage" id="gcp-storage" />
                    <Label htmlFor="gcp-storage" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">GCP Cloud Storage</span>
                        <Badge variant="secondary">Google</Badge>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading to {getProviderName(cloudProvider)}...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to Cloud
                  </>
                )}
              </Button>

              {/* Response Area */}
              {uploadResponse && (
                <Alert className={uploadResponse.success ? 'border-green-500' : 'border-red-500'}>
                  {uploadResponse.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={uploadResponse.success ? 'text-green-800' : 'text-red-800'}>
                    {uploadResponse.message}
                    {uploadResponse.success && (
                      <div className="mt-2">
                        <Link href="/files">
                          <Button variant="outline" size="sm" className="mt-2">
                            <Files className="h-4 w-4 mr-2" />
                            View All Files
                          </Button>
                        </Link>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  )
}
