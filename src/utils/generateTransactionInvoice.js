import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import QRCode from 'qrcode';
import { generateTransactionInvoiceHTML } from './generateTransactionInvoiceHtml';
import { GetInvoice, GenerateInvoice } from '../api/services/Invoice.Service';

// Get Android API level safely
const getAndroidApiLevel = () => {
  if (Platform.OS === 'android') {
    try {
      return Platform.Version;
    } catch (error) {
      console.warn('Could not determine Android API level:', error);
      return 29; // Default to older version to be safe
    }
  }
  return 0;
};

// Note: Date formatting moved to generateTransactionInvoiceHtml.js

// Debug function to log available directories
const logAvailableDirectories = async () => {
  if (Platform.OS === 'android') {
    try {
      const { dirs } = ReactNativeBlobUtil.fs;

      // Test if we can write to Downloads
      if (dirs.DownloadDir) {
        try {
          const testFile = `${dirs.DownloadDir}/test_write.txt`;
          await RNFS.writeFile(testFile, 'test', 'utf8');
          await RNFS.unlink(testFile);
        } catch (error) {
          console.log('Downloads directory is not writable:', error.message);
        }
      }
    } catch (error) {
      console.log('Error checking directories:', error);
    }
  }
};

// Removed unused calculateTotal after website-like breakdown refactor

// Enhanced error handling and user feedback
const showAlert = (title, message, onPress = null) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'OK',
        onPress: onPress,
      },
    ],
    { cancelable: false }
  );
};

// Request Android permissions for file access
const requestAndroidPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const apiLevel = getAndroidApiLevel();

      // For Android 10 (API 29) and below, we need WRITE_EXTERNAL_STORAGE
      // For Android 11+ (API 30+), we don't need this permission for Downloads folder
      if (apiLevel < 30) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to storage to download your receipt.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        return hasPermission;
      } else {
        // Android 11+ doesn't need WRITE_EXTERNAL_STORAGE for Downloads folder
        return true;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      // If permission request fails, try to proceed anyway
      return true;
    }
  }
  return true;
};

// Get or generate invoice from backend
const getInvoice = async (transaction) => {
  try {
    const response = await GetInvoice(transaction.slug);

    if (response?.invoice) {
      return response.invoice;
    }
  } catch (error) {
    // Special handling for 404 errors
    if (error.message === 'invoice not found') {
      try {
        const generateResult = await GenerateInvoice(transaction._id);
        if (generateResult?.success && generateResult?.invoice) {
          return generateResult.invoice;
        }
        throw new Error(generateResult?.error || 'Failed to generate invoice after 404');
      } catch (genError) {
        console.error('Error generating new invoice:', genError);
        return null;
      }
    }

    // For other errors, log and return null
    console.error('Error in getInvoice:', error);
    return null;
  }
};

// Generate QR code from invoice data (React Native compatible - no canvas)
const generateQRCode = async (qrCodeData) => {
  try {
    // Generate QR code as SVG string (no canvas required in React Native)
    const qrSvgString = await QRCode.toString(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'svg',
      margin: 1,
      width: 120,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Return as data URL for embedding in HTML
    return `data:image/svg+xml,${encodeURIComponent(qrSvgString)}`;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

// Note: HTML generation moved to separate file generateTransactionInvoiceHtml.js

export const generateTransactionInvoice = async (transaction, providerName, patientName, appointment = null, onProgress = null) => {
  try {
    // Log available directories for debugging
    await logAvailableDirectories();

    // Request permissions first
    const hasPermission = await requestAndroidPermissions();
    if (!hasPermission) {
      showAlert(
        'Permission Required',
        'Storage permission is required to download your receipt. Please grant permission and try again.'
      );
      return { success: false, error: 'Permission denied' };
    }

    // Update progress
    if (onProgress) { onProgress('Fetching invoice...', 15); }

    // Get or generate invoice with QR code data
    let qrCodeDataURL = null;
    const invoiceResult = await getInvoice(transaction);

    if (invoiceResult?.qrCodeData) {
      // Update progress
      if (onProgress) { onProgress('Generating QR code...', 20); }

      // Generate QR code from invoice data
      qrCodeDataURL = await generateQRCode(invoiceResult.qrCodeData);
    }

    // Update progress
    if (onProgress) { onProgress('Generating PDF...', 25); }

    // Generate HTML content using new web-aligned format
    const htmlContent = generateTransactionInvoiceHTML(transaction, providerName, patientName, appointment, qrCodeDataURL);

    // Update progress
    if (onProgress) { onProgress('Converting to PDF...', 50); }

    // Generate PDF with website-like filename
    const documentType = (transaction?.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'Transaction');
    const txIdForFile = (transaction?.slug || transaction?.id || new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)).toString().toUpperCase();
    const options = {
      html: htmlContent,
      fileName: `${documentType}-Receipt-${txIdForFile}`,
      directory: 'Documents',
      base64: false,
    };

    const file = await RNHTMLtoPDF.convert(options);

    if (!file || !file.filePath) {
      throw new Error('PDF generation failed');
    }

    // Update progress
    if (onProgress) { onProgress('Saving file...', 75); }

    if (Platform.OS === 'ios') {
      // iOS: Use Share API to save to Files app
      const shareOptions = {
        type: 'application/pdf',
        url: `file://${file.filePath}`,
        saveToFiles: true,
        filename: options.fileName,
      };

      try {
        await Share.open(shareOptions);

        if (onProgress) { onProgress('Receipt saved successfully!', 100); }

        // Show success message
        showAlert(
          'Receipt Downloaded',
          'Your receipt has been saved to the Files app. Opening it now...',
          () => {
            // Try to open the Files app
            try {
              Linking.openURL('shareddocuments://');
            } catch (linkError) {
              // If Files app fails, try to open the file directly
              try {
                Share.open({
                  type: 'application/pdf',
                  url: `file://${file.filePath}`,
                  saveToFiles: false, // Don't save again, just open
                });
              } catch (shareError) {
                showAlert(
                  'File Saved',
                  'Receipt has been saved to the Files app. You can access it from there.'
                );
              }
            }
          }
        );

        return { success: true, filePath: file.filePath, platform: 'ios' };
      } catch (shareError) {
        console.error('Share error:', shareError);
        throw new Error('Failed to save receipt to Files app');
      }
    } else {
      // Android: Save to Downloads folder
      const { dirs } = ReactNativeBlobUtil.fs;
      const pdfName = `${options.fileName}.pdf`;

      // Try multiple download paths for better compatibility
      let downloadPath;
      let downloadSuccess = false;

      // First try the standard Downloads directory
      if (dirs.DownloadDir) {
        downloadPath = `${dirs.DownloadDir}/${pdfName}`;
        try {
          // Check if file already exists and remove it
          const exists = await RNFS.exists(downloadPath);
          if (exists) {
            await RNFS.unlink(downloadPath);
          }

          // Move file to downloads
          await ReactNativeBlobUtil.fs.mv(file.filePath, downloadPath);
          downloadSuccess = true;
        } catch (error) {
          console.log('Failed to save to Downloads directory:', error);
          // Try to create the directory if it doesn't exist
          try {
            await RNFS.mkdir(dirs.DownloadDir);
            await ReactNativeBlobUtil.fs.mv(file.filePath, downloadPath);
            downloadSuccess = true;
          } catch (createError) {
            console.log('Failed to create Downloads directory:', createError);
          }
        }
      }

      // If Downloads directory failed, try Documents directory
      if (!downloadSuccess && dirs.DocumentDir) {
        downloadPath = `${dirs.DocumentDir}/${pdfName}`;
        try {
          const exists = await RNFS.exists(downloadPath);
          if (exists) {
            await RNFS.unlink(downloadPath);
          }

          await ReactNativeBlobUtil.fs.mv(file.filePath, downloadPath);
          downloadSuccess = true;
        } catch (error) {
          console.log('Failed to save to Documents directory:', error);
        }
      }

      // If both failed, try the app's internal storage
      if (!downloadSuccess) {
        downloadPath = `${RNFS.DocumentDirectoryPath}/${pdfName}`;
        try {
          const exists = await RNFS.exists(downloadPath);
          if (exists) {
            await RNFS.unlink(downloadPath);
          }

          await RNFS.copyFile(file.filePath, downloadPath);
          downloadSuccess = true;
        } catch (error) {
          console.log('Failed to save to internal storage:', error);
        }
      }

      if (!downloadSuccess) {
        // Final fallback: save to internal storage and use share intent
        downloadPath = `${RNFS.DocumentDirectoryPath}/${pdfName}`;
        try {
          const exists = await RNFS.exists(downloadPath);
          if (exists) {
            await RNFS.unlink(downloadPath);
          }

          await RNFS.copyFile(file.filePath, downloadPath);
          downloadSuccess = true;

          // Use share intent to let user choose where to save
          const shareOptions = {
            type: 'application/pdf',
            url: `file://${downloadPath}`,
            filename: pdfName,
          };

          try {
            await Share.open(shareOptions);
          } catch (shareError) {
            console.log('Share intent failed, but file is saved:', shareError);
          }
        } catch (error) {
          console.log('Failed to save to internal storage as fallback:', error);
        }
      }

      if (!downloadSuccess) {
        throw new Error('Failed to save file to any accessible location');
      }

      // Update progress
      if (onProgress) { onProgress('Receipt saved successfully!', 100); }

      // Wait a moment for the file to be fully written, then try to open it
      setTimeout(async () => {
        // Try to open the file immediately without showing alert first
        let fileOpened = false;

        try {
          // Method 1: Try to open with ReactNativeBlobUtil (using correct method)
          try {
            // Use the correct ReactNativeBlobUtil method for opening documents
            if (ReactNativeBlobUtil.android && ReactNativeBlobUtil.android.openDocument) {
              ReactNativeBlobUtil.android.openDocument(downloadPath);
              fileOpened = true;
            }
          } catch (openError) {
            console.log('ReactNativeBlobUtil open failed:', openError);
          }

          // Method 2: Try with share intent (this is working based on logs)
          if (!fileOpened) {
            try {
              const shareOptions = {
                type: 'application/pdf',
                url: `file://${downloadPath}`,
                filename: pdfName,
              };
              Share.open(shareOptions);
              fileOpened = true;
            } catch (shareError) {
              console.log('Share intent failed:', shareError);
            }
          }

          // Method 3: Try to open the folder containing the file
          if (!fileOpened) {
            try {
              const folderPath = downloadPath.substring(0, downloadPath.lastIndexOf('/'));
              if (ReactNativeBlobUtil.android && ReactNativeBlobUtil.android.openDocument) {
                ReactNativeBlobUtil.android.openDocument(folderPath);
                fileOpened = true;
              }
            } catch (folderError) {
              console.log('Failed to open folder:', folderError);
            }
          }

          // Method 4: Use Android Intent with file:// URI
          if (!fileOpened) {
            try {
              const fileUri = `file://${downloadPath}`;

              // Try to open with ReactNativeBlobUtil using different approach
              if (ReactNativeBlobUtil.android && ReactNativeBlobUtil.android.openDocument) {
                ReactNativeBlobUtil.android.openDocument(fileUri);
                fileOpened = true;
              }
            } catch (uriError) {
              console.log('File URI method failed:', uriError);
            }
          }

          // Method 5: Try to open with content:// URI if available
          if (!fileOpened) {
            try {
              const contentUri = `content://${downloadPath}`;
              if (ReactNativeBlobUtil.android && ReactNativeBlobUtil.android.openDocument) {
                ReactNativeBlobUtil.android.openDocument(contentUri);
                fileOpened = true;
              }
            } catch (contentError) {
              console.log('Content URI method failed:', contentError);
            }
          }

          // Only show alert if file couldn't be opened at all
          if (!fileOpened) {
            showAlert(
              'Receipt Downloaded',
              'Receipt has been saved to your device. You can find it in your file manager.',
              () => {
                // Try one final time with Intent
                try {
                  const intent = `intent://${downloadPath}#Intent;action=android.intent.action.VIEW;type=application/pdf;end`;
                  Linking.openURL(intent);
                } catch (finalError) {
                  // Final attempt failed
                }
              }
            );
          }
        } catch (error) {
          // If all methods failed, show the file location
          showAlert(
            'Receipt Downloaded',
            'Receipt has been saved to your device. You can find it in your file manager.',
            () => {
              // Try one final time with Intent
              try {
                const intent = `intent://${downloadPath}#Intent;action=android.intent.action.VIEW;type=application/pdf;end`;
                Linking.openURL(intent);
              } catch (finalError) {
                // Final attempt failed
              }
            }
          );
        }
      }, 500); // Wait 500ms for file to be fully written

      return { success: true, filePath: downloadPath, platform: 'android' };
    }
  } catch (error) {
    console.error('Error generating or downloading PDF:', error);

    // Show user-friendly error message
    let errorMessage = 'Failed to download receipt. Please try again.';

    if (error.message.includes('Permission')) {
      errorMessage = 'Storage permission is required. Please grant permission and try again.';
    } else if (error.message.includes('PDF generation')) {
      errorMessage = 'Failed to generate receipt. Please try again.';
    } else if (error.message.includes('Files app')) {
      errorMessage = 'Failed to save to Files app. Please check your storage and try again.';
    } else if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      errorMessage = 'Failed to access storage. Please check your device storage and try again.';
    } else if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      errorMessage = 'Access denied. Please check your device permissions and try again.';
    }

    showAlert('Download Failed', errorMessage);
    return { success: false, error: error.message };
  }
};
