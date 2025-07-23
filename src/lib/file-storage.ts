export interface StoredFile {
  id: string
  name: string
  size: number
  type: string
  provider: 'aws-s3' | 'azure-blob' | 'gcp-storage'
  uploadDate: string
  url?: string
  thumbnailUrl?: string
}

const STORAGE_KEY = 'clouduploader_files'

export class FileStorage {
  static getAllFiles(): StoredFile[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading files from storage:', error)
      return []
    }
  }

  static saveFile(file: File, provider: StoredFile['provider']): StoredFile {
    const newFile: StoredFile = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      provider,
      uploadDate: new Date().toISOString(),
      url: URL.createObjectURL(file),
      thumbnailUrl: URL.createObjectURL(file),
    }

    const files = this.getAllFiles()
    files.unshift(newFile) // Add to beginning

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
    } catch (error) {
      console.error('Error saving file to storage:', error)
    }

    return newFile
  }

  static deleteFile(fileId: string): boolean {
    try {
      const files = this.getAllFiles()
      const fileIndex = files.findIndex(f => f.id === fileId)

      if (fileIndex === -1) return false

      // Revoke object URL to free memory
      const file = files[fileIndex]
      if (file.url) URL.revokeObjectURL(file.url)
      if (file.thumbnailUrl) URL.revokeObjectURL(file.thumbnailUrl)

      files.splice(fileIndex, 1)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
      return true
    } catch (error) {
      console.error('Error deleting file from storage:', error)
      return false
    }
  }

  static getFilesPaginated(page: number, perPage: number = 20): {
    files: StoredFile[]
    totalFiles: number
    totalPages: number
    currentPage: number
  } {
    const allFiles = this.getAllFiles()
    const totalFiles = allFiles.length
    const totalPages = Math.ceil(totalFiles / perPage)
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const files = allFiles.slice(startIndex, endIndex)

    return {
      files,
      totalFiles,
      totalPages,
      currentPage: page,
    }
  }

  static getProviderName(provider: StoredFile['provider']): string {
    switch (provider) {
      case 'aws-s3': return 'AWS S3'
      case 'azure-blob': return 'Azure Blob'
      case 'gcp-storage': return 'GCP Storage'
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
