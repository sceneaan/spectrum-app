/**
 * Format file size in human readable format
 * @param {number} size - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB", "500 KB", "100 B")
 */
export const formatFileSize = (size) => {
  if (!size || isNaN(size)) {
    return 'Unknown size';
  }

  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
};

/**
 * Get file size from various file object formats
 * @param {Object} file - File object from different sources
 * @returns {number|null} File size in bytes or null if not available
 */
export const getFileSize = (file) => {
  if (!file) {return null;}

  // Try different possible properties for file size
  const size = file.size || file.fileSize || file.length || file.response?.size || file.data?.size;

  // If we have a size, return it
  if (size && !isNaN(size)) {
    return size;
  }

  // For DocumentPicker files, check additional properties
  if (file.originalFile && file.originalFile.size) {
    return file.originalFile.size;
  }

  // For server responses, check if size is in the response data
  if (file.response && file.response.size) {
    return file.response.size;
  }

  // For mobile files, try to get size from file info
  if (file.uri && typeof file.uri === 'string') {
    // This is a fallback - in practice, the size should be available in the file object
    console.log('File size not found in object, trying URI fallback');
  }

  return null;
};

/**
 * Validate file size against maximum allowed size
 * @param {Object} file - File object
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if file size is valid
 */
export const validateFileSize = (file, maxSize) => {
  const fileSize = getFileSize(file);
  if (!fileSize) {return false;}
  return fileSize <= maxSize;
};

/**
 * Get file extension from filename or URL
 * @param {string} filename - File name or URL
 * @returns {string} File extension (e.g., "pdf", "jpg")
 */
export const getFileExtension = (filename) => {
  if (!filename) {return '';}
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Check if file type is allowed
 * @param {string} filename - File name
 * @param {Array} allowedExtensions - Array of allowed extensions
 * @returns {boolean} True if file type is allowed
 */
export const isFileTypeAllowed = (filename, allowedExtensions) => {
  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension);
};
