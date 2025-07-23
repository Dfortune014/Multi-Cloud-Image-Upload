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

export default function FilesPage() {
  const [files, setFiles] = useState<StoredFile[]>([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  const filesPerPage = 20

  useEffect(() => {
    loadFiles(currentPage)
  }, [currentPage])

  const loadFiles = (page: number) => {
    setLoading(true)
    try {
      const result = FileStorage.getFilesPaginated(page, filesPerPage)
      setFiles(result.files)
      setTotalFiles(result.totalFiles)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    } catch (error) {
      console.error('Error loading files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    setDeletingFile(fileId)

    try {
      const success = FileStorage.deleteFile(fileId)
      if (success) {
        toast.success(`"${fileName}" deleted successfully`)
        // Reload current page, or go to previous page if current page is empty
        const newResult = FileStorage.getFilesPaginated(currentPage, filesPerPage)
        if (newResult.files.length === 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
        } else {
          loadFiles(currentPage)
        }
      } else {
        toast.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Error deleting file')
    } finally {
      setDeletingFile(null)
    }
  }

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
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your uploaded images across all cloud providers
          </p>
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
                {files.map((file) => (
                  <Card key={file.id} className="shadow-lg overflow-hidden group">
                    <CardContent className="p-0">
                      {/* Image Preview */}
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
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
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          disabled={deletingFile === file.id}
                        >
                          {deletingFile === file.id ? (
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
                            {FileStorage.getProviderName(file.provider)}
                          </Badge>

                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(file.url, '_blank')}
                              title="View full size"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              disabled={deletingFile === file.id}
                              title="Delete file"
                            >
                              {deletingFile === file.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {FileStorage.formatDate(file.uploadDate)}
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
