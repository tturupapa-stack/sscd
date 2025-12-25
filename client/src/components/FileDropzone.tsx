import { useCallback, useState } from 'react'

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void
  disabled?: boolean
}

/**
 * Drag-and-drop zone for markdown file uploads.
 * Supports both drag-and-drop and click-to-upload interactions.
 */
export default function FileDropzone({ onFilesAdded, disabled = false }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    const mdFiles = droppedFiles.filter(file => file.name.endsWith('.md'))

    if (mdFiles.length > 0) {
      onFilesAdded(mdFiles)
    }
  }, [disabled, onFilesAdded])

  const handleClick = useCallback(() => {
    if (disabled) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md'
    input.multiple = true
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        onFilesAdded(Array.from(target.files))
      }
    }
    input.click()
  }, [disabled, onFilesAdded])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="md 파일을 드래그하거나 클릭하여 업로드"
      aria-disabled={disabled}
      className={`
        relative rounded-lg border-2 border-dashed p-12
        transition-all duration-200 ease-in-out
        ${isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }
        ${disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Upload Icon */}
        <svg
          className={`mb-4 h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        {/* Main Text */}
        <p className={`text-base font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
          {isDragOver
            ? '여기에 파일을 놓으세요'
            : 'md 파일을 드래그하거나 클릭하여 업로드'
          }
        </p>

        {/* Subtext */}
        <p className="mt-2 text-sm text-gray-500">
          프로젝트 또는 루틴 md 파일 (여러 파일 가능)
        </p>

        {/* File Format Info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="rounded bg-gray-100 px-2 py-1">.md</span>
          <span>마크다운 파일만 지원</span>
        </div>
      </div>
    </div>
  )
}
