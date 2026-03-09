'use client';

import { useCallback, useRef, useState } from 'react';
import { useLibraryStore } from '@/stores/library-store';
import styles from './UploadRom.module.css';

export function UploadRom() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useLibraryStore((s) => s.upload);
  const uploadRom = useLibraryStore((s) => s.uploadRom);

  const handleFile = useCallback(
    (file: File) => {
      uploadRom(file);
    },
    [uploadRom],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  const handleBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRetry = useCallback(() => {
    useLibraryStore.setState({ upload: { status: 'idle' } });
  }, []);

  const isProcessing =
    upload.status === 'reading' ||
    upload.status === 'hashing' ||
    upload.status === 'storing';

  return (
    <div
      className={styles.dropZone}
      data-drag-over={dragOver || undefined}
      data-status={upload.status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="ROM upload area"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gba,.gbc,.gb"
        onChange={handleInputChange}
        className={styles.fileInput}
        tabIndex={-1}
        aria-hidden="true"
      />

      {upload.status === 'idle' && (
        <div className={styles.content}>
          <svg
            className={styles.icon}
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="4"
              y="8"
              width="32"
              height="24"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect x="14" y="12" width="12" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <circle cx="28" cy="24" r="3" fill="currentColor" opacity="0.5" />
            <rect x="8" y="28" width="6" height="2" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
          <p className={styles.label}>Drop a ROM here</p>
          <button
            className={styles.browseBtn}
            onClick={handleBrowse}
            type="button"
            aria-label="Browse files"
          >
            or browse files
          </button>
          <p className={styles.hint}>.gba, .gbc, .gb</p>
        </div>
      )}

      {isProcessing && (
        <div className={styles.content}>
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.label}>
            {upload.status === 'reading' && 'Reading file...'}
            {upload.status === 'hashing' && 'Generating hash...'}
            {upload.status === 'storing' && 'Saving to library...'}
          </p>
          {upload.filename && (
            <p className={styles.hint}>{upload.filename}</p>
          )}
        </div>
      )}

      {upload.status === 'done' && (
        <div className={styles.content}>
          <svg
            className={styles.checkIcon}
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 20l6 6 10-12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className={styles.label}>Added to library!</p>
        </div>
      )}

      {upload.status === 'error' && (
        <div className={styles.content}>
          <svg
            className={styles.errorIcon}
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" />
            <path
              d="M14 14l12 12M26 14l-12 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <p className={styles.errorMsg}>{upload.error}</p>
          <button
            className={styles.browseBtn}
            onClick={handleRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
