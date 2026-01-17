'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertTriangle, Loader2, Lock } from 'lucide-react';

/**
 * Props for the UploadDropzone component.
 */
interface UploadDropzoneProps {
  /** Callback when a file is selected */
  onFileSelect: (file: File) => Promise<void>;
  /** Whether the file is currently being processed */
  isProcessing: boolean;
  /** Error message to display */
  error: string | null;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
}

/**
 * File upload dropzone component - Nighttime Mischief Theme
 * Supports drag-and-drop and click-to-browse for resume files.
 */
export function UploadDropzone({
  onFileSelect,
  isProcessing,
  error,
  acceptedTypes = ['.pdf'],
  maxSize = 10 * 1024 * 1024, // 10MB default
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = error || localError;

  /**
   * Validates the selected file.
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const fileName = file.name.toLowerCase();
      const isValidType = acceptedTypes.some(
        (type) => fileName.endsWith(type.toLowerCase()) || file.type === type
      );

      if (!isValidType) {
        return `Invalid file type. Please upload a ${acceptedTypes.join(' or ')} file.`;
      }

      // Check file size
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        return `File is too large. Maximum size is ${maxMB}MB.`;
      }

      return null;
    },
    [acceptedTypes, maxSize]
  );

  /**
   * Handles file selection (from drag or click).
   */
  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }

      setSelectedFile(file);
      await onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  /**
   * Handles drag enter event.
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * Handles drag over event.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  /**
   * Handles drag leave event.
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  /**
   * Handles file drop.
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [handleFile]
  );

  /**
   * Handles file input change.
   */
  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [handleFile]
  );

  /**
   * Opens the file browser.
   */
  const handleClick = useCallback(() => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  }, [isProcessing]);

  /**
   * Handles keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  /**
   * Formats file size for display.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Determine visual state
  const getStateStyles = () => {
    if (displayError) {
      return 'border-pink-500/60 bg-pink-500/10';
    }
    if (isProcessing) {
      return 'border-cyan-500/60 bg-cyan-500/10';
    }
    if (isDragOver) {
      return 'border-orange-500/60 bg-orange-500/10 scale-[1.02]';
    }
    if (selectedFile) {
      return 'border-green-500/60 bg-green-500/10';
    }
    return 'border-indigo-500/40 bg-indigo-950/40 hover:border-indigo-400/60 hover:bg-indigo-900/40';
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative rounded-2xl border-2 border-dashed p-8
          transition-all duration-200 ease-in-out
          cursor-pointer backdrop-blur-sm
          ${getStateStyles()}
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Upload resume file"
        aria-describedby="upload-description"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Icon */}
          <div className="mb-4">
            {isProcessing ? (
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : displayError ? (
              <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-pink-400" />
              </div>
            ) : selectedFile ? (
              <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                <Upload className="w-8 h-8 text-indigo-300" />
              </div>
            )}
          </div>

          {/* Text content */}
          {isProcessing ? (
            <div>
              <p className="text-lg font-bold text-cyan-300">Extracting text...</p>
              <p className="text-sm text-cyan-400/80 mt-1">
                Analyzing your resume locally in your browser
              </p>
            </div>
          ) : displayError ? (
            <div>
              <p className="text-lg font-bold text-pink-300">Upload failed</p>
              <p className="text-sm text-pink-400/80 mt-1">{displayError}</p>
              <p className="text-sm text-indigo-400 mt-2">Click to try again</p>
            </div>
          ) : selectedFile ? (
            <div>
              <p className="text-lg font-bold text-green-300">File ready</p>
              <p className="text-sm text-indigo-300 mt-1">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          ) : (
            <div id="upload-description">
              <p className="text-lg font-bold text-white">
                Drag & drop your resume here
              </p>
              <p className="text-sm text-indigo-300 mt-1">or click to browse</p>
              <p className="text-xs text-indigo-400 mt-3">
                Supported: PDF, DOCX • Max 10MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-indigo-400">
        <div className="w-5 h-5 rounded-lg bg-green-500/20 flex items-center justify-center">
          <Lock className="w-3 h-3 text-green-400" />
        </div>
        <span>Processed locally in your browser. Your resume is never uploaded.</span>
      </div>
    </div>
  );
}
