import { useRef, useState, type ChangeEvent } from 'react';
import { cn } from '@camtraffic/utils';

export interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFileSelect: (files: File[]) => void;
  error?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  label = 'Upload files',
  accept,
  multiple = false,
  maxSize,
  onFileSelect,
  error,
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (maxSize) {
      const validFiles = fileArray.filter((file) => file.size <= maxSize);
      if (validFiles.length !== fileArray.length) {
        // Some files exceeded max size
        console.warn('Some files exceeded maximum size');
      }
      onFileSelect(validFiles);
    } else {
      onFileSelect(fileArray);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={cn('ct-file-upload', className)}>
      <div
        className={cn(
          'ct-file-upload__dropzone',
          isDragging && 'ct-file-upload__dropzone--dragging',
          error && 'ct-file-upload__dropzone--error',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p className="ct-file-upload__label">{label}</p>
        {hint && !error ? <p className="ct-file-upload__hint">{hint}</p> : null}
        {error ? <p className="ct-file-upload__error">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="ct-file-upload__input"
          aria-label={label}
        />
      </div>
    </div>
  );
}
