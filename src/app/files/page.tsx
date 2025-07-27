'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileStorage, type StoredFile } from '@/lib/file-storage'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  Files,
  Trash2,
  Download,
  Eye,
  Calendar,
  HardDrive,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react'

// Image Preview Component
const ImagePreview = ({ fileName, provider = 'aws-s3' }: { fileName: string; provider?: string }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        let apiEndpoint: string;
        switch (provider) {
          case 'gcp-storage':
            apiEndpoint = '/api/gcp/gcp-get';
            break;
          case 'azure-blob':
            apiEndpoint = '/api/azure/azure-get';
            break;
          case 'aws-s3':
          default:
            apiEndpoint = '/api/aws/aws-get';
            break;
        }

        const presignedUrlResponse = await fetch(apiEndpoint, {
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
  }, [fileName, provider]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageIcon className="h-12 w-12 text-slate-400" />
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

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]); // S3 file objects
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'aws-s3' | 'azure-blob' | 'gcp-storage'>('aws-s3');

  const filesPerPage = 20;

  useEffect(() => {
    loadFiles();
  }, [selectedProvider]);

  // Fetch files from S3, Azure, or GCP API
  const loadFiles = async () => {
    setLoading(true);
    try {
      let apiEndpoint: string;
      switch (selectedProvider) {
        case 'azure-blob':
          apiEndpoint = '/api/azure/azure-list';
          break;
        case 'gcp-storage':
          apiEndpoint = '/api/gcp/gcp-list';
          break;
        case 'aws-s3':
        default:
          apiEndpoint = '/api/aws/aws-list';
          break;
      }
      
      const res = await fetch(apiEndpoint);
      const data = await res.json();
      if (res.ok && data.files) {
        setFiles(data.files);
        setTotalFiles(data.files.length);
        setTotalPages(Math.ceil(data.files.length / filesPerPage));
        setCurrentPage(1);
      } else {
        setFiles([]);
        setTotalFiles(0);
        setTotalPages(0);
        setCurrentPage(1);
      }
    } catch (error) {
      setFiles([]);
      setTotalFiles(0);
      setTotalPages(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Paginate files in-memory
  const paginatedFiles = files.slice((currentPage - 1) * filesPerPage, currentPage * filesPerPage);

  // Delete file using presigned URL
  const handleDeleteFile = async (fileName: string) => {
    setDeletingFile(fileName);
    try {
      // Determine API endpoint based on selected provider
      let apiEndpoint: string;
      switch (selectedProvider) {
        case 'gcp-storage':
          apiEndpoint = '/api/gcp/gcp-delete';
          break;
        case 'azure-blob':
          apiEndpoint = '/api/azure/azure-delete';
          break;
        case 'aws-s3':
        default:
          apiEndpoint = '/api/aws/aws-delete';
          break;
      }

      // Step 1: Get presigned delete URL from backend
      const presignedUrlResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get delete URL');
      }

      const { presignedUrl } = await presignedUrlResponse.json();

      // Step 2: Delete directly from cloud storage using presigned URL
      const deleteResponse = await fetch(presignedUrl, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete file from ${selectedProvider}`);
      }

      toast.success(`"${fileName}" deleted successfully`);
      loadFiles(); // Refresh the list after deletion
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting file');
    } finally {
      setDeletingFile(null);
    }
  };

  // View/download file using presigned URL
  const handleViewFile = async (fileName: string) => {
    try {
      // Determine API endpoint based on selected provider
      let apiEndpoint: string;
      switch (selectedProvider) {
        case 'gcp-storage':
          apiEndpoint = '/api/gcp/gcp-get';
          break;
        case 'azure-blob':
          apiEndpoint = '/api/azure/azure-get';
          break;
        case 'aws-s3':
        default:
          apiEndpoint = '/api/aws/aws-get';
          break;
      }

      // Step 1: Get presigned download URL from backend
      const presignedUrlResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get download URL');
      }

      const { presignedUrl } = await presignedUrlResponse.json();

      // Step 2: Open the presigned URL in a new tab
      window.open(presignedUrl, '_blank');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error fetching file');
    }
  };



  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const renderPaginationItems = () => {
    const items = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      )

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis1" />)
      }

      // Show current page and neighbors
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis2" />)
      }

      // Always show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )
      }
    }

    return items
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Your Files
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            Manage your uploaded images across all cloud providers
          </p>
          
          {/* Provider Selector */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <button
                onClick={() => setSelectedProvider('aws-s3')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedProvider === 'aws-s3'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                AWS S3
              </button>
              <button
                onClick={() => setSelectedProvider('azure-blob')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedProvider === 'azure-blob'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Azure Blob
              </button>
              <button
                onClick={() => setSelectedProvider('gcp-storage')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedProvider === 'gcp-storage'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                GCP Storage
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Files className="h-5 w-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Files: {totalFiles}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Files Grid */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <ImageIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No files found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Upload your first image to get started
                </p>
                <Link href="/">
                  <Button>Upload Files</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {paginatedFiles.map((file) => (
                  <Card key={file.name} className="shadow-lg overflow-hidden group">
                    <CardContent className="p-0">
                      {/* Image Preview */}
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        {isImageFile(file.name) ? (
                          <ImagePreview fileName={file.name} provider={selectedProvider} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-slate-400" />
                          </div>
                        )}

                        {/* Delete button overlay */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteFile(file.name)}
                          disabled={deletingFile === file.name}
                        >
                          {deletingFile === file.name ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* File Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {FileStorage.formatFileSize(file.size)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {selectedProvider === 'aws-s3' ? 'AWS S3' : 
                             selectedProvider === 'azure-blob' ? 'Azure Blob' : 'GCP Storage'}
                          </Badge>

                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewFile(file.name)}
                              title="View full size"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteFile(file.name)}
                              disabled={deletingFile === file.name}
                              title="Delete file"
                            >
                              {deletingFile === file.name ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {renderPaginationItems()}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  )
}
