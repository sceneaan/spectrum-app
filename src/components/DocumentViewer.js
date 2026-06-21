import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Text, StatusBar, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNShare from 'react-native-share';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { getPrivateFileAsBase64 } from '../api/services/Upload.Service';
import environment from '../config/environment';

/**
 * DocumentViewer - Displays HTML documents with support for private file URLs
 * Includes print and save functionality
 */
const DocumentViewer = ({ visible, onClose, htmlContent, title, privateFileIds = {} }) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [processedHtml, setProcessedHtml] = useState('');
  const [isProcessingPrivateFiles, setIsProcessingPrivateFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const webViewRef = useRef(null);

  // Process private file IDs and replace placeholders with base64 URLs
  const processPrivateFiles = useCallback(async (html, fileIds) => {
    if (!html || Object.keys(fileIds).length === 0) {
      return html;
    }

    setIsProcessingPrivateFiles(true);
    let processedContent = html;

    try {
      const entries = Object.entries(fileIds);
      for (const [placeholder, fileId] of entries) {
        if (fileId) {
          try {
            console.log(`📄 [DocumentViewer] Loading private file: ${placeholder} -> ${fileId}`);
            const base64Url = await getPrivateFileAsBase64(fileId);
            if (base64Url) {
              processedContent = processedContent.replace(
                new RegExp(placeholder, 'g'),
                base64Url
              );
            }
          } catch (fetchError) {
            console.error(`Error loading private file ${fileId}:`, fetchError);
          }
        }
      }
    } catch (error) {
      console.error('Error processing private files:', error);
    } finally {
      setIsProcessingPrivateFiles(false);
    }

    return processedContent;
  }, []);

  // Track the last processed content to avoid re-processing
  const lastContentRef = useRef('');

  // Reset and process content when modal opens
  useEffect(() => {
    if (visible && htmlContent) {
      // Skip if content hasn't changed
      if (lastContentRef.current === htmlContent && processedHtml) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const processContent = async () => {
        let finalHtml = htmlContent;

        if (Object.keys(privateFileIds).length > 0) {
          finalHtml = await processPrivateFiles(htmlContent, privateFileIds);
        }

        lastContentRef.current = htmlContent;
        setProcessedHtml(finalHtml);
        // Give WebView a moment to render, then hide loading
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      };

      processContent();
    } else if (!visible) {
      // Reset state when modal closes
      setProcessedHtml('');
      setIsLoading(true);
      lastContentRef.current = '';
    }
  }, [visible, htmlContent, privateFileIds, processPrivateFiles]);

  const handleClose = () => {
    if (webViewRef.current) {
      webViewRef.current.stopLoading();
    }
    onClose();
  };

  // Fetch image and convert to base64
  const fetchImageAsBase64 = async (imageUrl) => {
    try {
      console.log('📄 [DocumentViewer] Fetching image:', imageUrl);
      const response = await ReactNativeBlobUtil.fetch('GET', imageUrl);
      const base64 = response.base64();
      const contentType = response.info().headers['Content-Type'] || 'image/png';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };

  // Process HTML to embed header/footer images as base64
  const processHtmlForSave = async (html) => {
    let processedContent = html;
    const FILE_URL = environment.file_url;

    // Replace header image URL with base64
    const headerUrl = `${FILE_URL}/uploads/app/document-header.png`;
    const footerUrl = `${FILE_URL}/uploads/app/document-footer.png`;

    try {
      // Fetch and embed header image
      const headerBase64 = await fetchImageAsBase64(headerUrl);
      if (headerBase64) {
        processedContent = processedContent.replace(
          new RegExp(headerUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          headerBase64
        );
      }

      // Fetch and embed footer image
      const footerBase64 = await fetchImageAsBase64(footerUrl);
      if (footerBase64) {
        processedContent = processedContent.replace(
          new RegExp(footerUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          footerBase64
        );
      }
    } catch (error) {
      console.error('Error processing images for save:', error);
    }

    return processedContent;
  };

  // Save/Share document as HTML file with embedded images
  const handleSave = async () => {
    if (!processedHtml) {
      Alert.alert('Error', 'No document to save');
      return;
    }

    setIsSaving(true);

    try {
      // Process HTML to embed header/footer images as base64
      const htmlWithEmbeddedImages = await processHtmlForSave(processedHtml);

      const fileName = `${(title || 'Document').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}.html`;

      // Save HTML with embedded images to Documents directory
      await ReactNativeBlobUtil.fs.writeFile(filePath, htmlWithEmbeddedImages, 'utf8');
      console.log('📄 [DocumentViewer] Document saved to:', filePath);

      // Share the file
      const shareOptions = {
        title: title || 'Document',
        message: `${title || 'Document'}`,
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        type: 'text/html',
        subject: title || 'Document',
        saveToFiles: true,
      };

      await RNShare.open(shareOptions);
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Error saving document:', error);
        Alert.alert('Error', 'Failed to save document. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate if we should show loading
  const showLoading = isProcessingPrivateFiles || !processedHtml || isLoading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Document'}</Text>

          {/* Save/Download Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={styles.actionButton}
            disabled={showLoading || isSaving}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Image
                source={ICONS.download || ICONS.upload}
                style={[styles.actionIcon, showLoading && styles.disabledIcon]}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          {/* WebView - always render but hide until ready */}
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={processedHtml ? { html: processedHtml } : { html: '<html><body></body></html>' }}
            style={[styles.webview, !processedHtml && styles.hiddenWebview]}
            scalesPageToFit={Platform.OS === 'android'}
            onLoad={() => {
              if (processedHtml) {
                console.log('📄 [DocumentViewer] WebView onLoad');
                setIsLoading(false);
              }
            }}
            onLoadEnd={() => {
              if (processedHtml) {
                console.log('📄 [DocumentViewer] WebView onLoadEnd');
                setIsLoading(false);
              }
            }}
            onError={(e) => {
              console.error('WebView error:', e.nativeEvent);
              setIsLoading(false);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
          />

          {/* Loading Overlay */}
          {showLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {isProcessingPrivateFiles ? 'Loading secure files...' :
                 !processedHtml ? 'Preparing document...' : 'Loading...'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 50,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.white,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  hiddenWebview: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray600,
  },
});

export default DocumentViewer;
