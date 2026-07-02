import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, FlatList, ActivityIndicator, Alert, Linking, ActionSheetIOS, Modal } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { AppText } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS } from '../theme';
import { useGetThreadMessages, useSendThreadReply, useMarkThreadAsRead } from '@api/services/Thread.Service';
import { useGetCurrentUser } from '@api/services/User.Service';
import { useGetCompletedAppointments } from '@api/services/Appointment.Service';
import { isProviderRole } from '@utils/videoAccess';
import { useAuthStore } from '../store/authStore';
import socketService from '@utils/socket';
import { formatFileSize, getFileSize } from '@utils/fileUtils';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  uploadAttachment,
  validateFile,
  getPrivateFileAsBase64,
} from '@api/services/Upload.Service';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DocumentViewer from '../components/DocumentViewer';
import { getMessagingEligibility } from '../utils/messagingEligibility';
import { isMessageFromUser, resolveUserId } from '../utils/threads';
import { useResolvedChatThread } from '../hooks/useResolvedChatThread';

const ChatDetailsScreen = () => {
   const navigation = useNavigation();
   const route = useRoute();
   const insets = useSafeAreaInsets();
   const { t, isRTL } = useLanguage();

   const { user } = useAuthStore();
   const { thread, threadId, hasValidThread, threadsLoading } = useResolvedChatThread(route.params);
   const { data: loggedInUser } = useGetCurrentUser();
   const currentUser = loggedInUser || user;
   const isProviderViewer = isProviderRole(user) || isProviderRole(loggedInUser);
   const counterparty = isProviderViewer ? thread?.patient : thread?.provider;
   const providerId = thread?.provider?._id || thread?.provider?.id || route.params?.providerId;
   const counterpartyDisplayName = isRTL
      ? (counterparty?.fullNameArabic || counterparty?.fullName || route.params?.providerName)
      : (counterparty?.fullNameEnglish || counterparty?.fullName || route.params?.providerName);

   const [messages, setMessages] = useState([]);
   const [inputText, setInputText] = useState('');
   const flatListRef = useRef(null);
   const invalidThreadHandled = useRef(false);

   const { data: appointments, isLoading: appointmentsLoading } = useGetCompletedAppointments();
   const {
     data: threadMessages,
     error: threadMessagesError,
     isLoading: isLoadingMessages,
     refetch: refetchMessages,
   } = useGetThreadMessages(threadId);
   const { mutate: sendMessage } = useSendThreadReply();
   const { mutate: markThreadAsRead } = useMarkThreadAsRead();
   const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
   const [attachmentViewerVisible, setAttachmentViewerVisible] = useState(false);
   const [attachmentViewerContent, setAttachmentViewerContent] = useState('');
   const [attachmentViewerTitle, setAttachmentViewerTitle] = useState('');
   const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);

   useEffect(() => {
      if (threadsLoading || hasValidThread || invalidThreadHandled.current) return;
      invalidThreadHandled.current = true;
      Alert.alert(
         t.common?.error || 'Error',
         t.messaging?.chatUnavailable || 'Chat information not available',
         [{ text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }]
      );
   }, [threadsLoading, hasValidThread, t, navigation]);

   const hasRecentAppointment = () => {
      if (isProviderViewer) return true;
      const eligibility = getMessagingEligibility(appointments, providerId);
      if (eligibility === null) return false;
      return eligibility;
   };

   const isThreadExpired = appointmentsLoading || threadsLoading ? true : !hasRecentAppointment();

   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
   }

   // Load messages
   useEffect(() => {
    if (threadMessages) {
      setMessages(threadMessages);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
   }, [threadMessages]);

   useFocusEffect(
     React.useCallback(() => {
       if (!threadId) return undefined;
       markThreadAsRead(threadId);
       refetchMessages();
       return undefined;
     }, [threadId, markThreadAsRead, refetchMessages]),
   );

   useEffect(() => {
    const userId = resolveUserId(currentUser);
    if (userId && threadId) {
      const handleNewMessage = (message) => {
        const messageThreadId = message?.thread?._id || message?.thread;
        if (String(messageThreadId) === String(threadId)) {
          setMessages(prevMessages => {
            const exists = prevMessages.some(m => String(m._id) === String(message._id));
            if (exists) return prevMessages;
            return [...prevMessages, message];
          });
          scrollToBottom();
        }
      };

      socketService.connect(String(userId))
        .then(() => {
          socketService.on('newMessage', handleNewMessage);
        })
        .catch(() => {});

      return () => {
        socketService.off('newMessage', handleNewMessage);
      };
    }
  }, [currentUser, threadId]);

   const scrollToBottom = () => {
       setTimeout(() => {
           flatListRef.current?.scrollToEnd({ animated: true });
       }, 200);
   };

   const handleSend = () => {
      if (!inputText.trim() || !threadId) return;

      const payload = {
        thread: threadId,
        body: inputText.trim(),
        attachment: null,
      };

      const optimisticBody = inputText.trim();
      setInputText('');

      sendMessage(payload, {
          onSuccess: (data) => {
              const savedMessage = data?.message || data;
              setMessages(prevMessages => {
                const id = savedMessage?._id || savedMessage?.id;
                if (id && prevMessages.some((m) => String(m._id) === String(id))) {
                  return prevMessages;
                }
                return [
                  ...prevMessages,
                  {
                    ...savedMessage,
                    body: savedMessage?.body ?? optimisticBody,
                    sender: savedMessage?.sender || currentUser,
                    createdAt: savedMessage?.createdAt || new Date().toISOString(),
                  },
                ];
              });
              refetchMessages();
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 200);
          },
          onError: (err) => {
              setInputText(optimisticBody);
              Alert.alert(
                t.common?.error || 'Error',
                err.message || t.messaging?.sendMessageFailed || 'Failed to send message'
              );
          }
      });
   };
   
   // Show attachment options menu
   const showAttachmentOptions = () => {
       if (Platform.OS === 'ios') {
           ActionSheetIOS.showActionSheetWithOptions(
               {
                   options: [
                     t.messaging?.cancel || 'Cancel',
                     t.messaging?.image || 'Image',
                     t.messaging?.file || t.messaging?.pdfFile || 'File',
                   ],
                   cancelButtonIndex: 0,
               },
               (buttonIndex) => {
                   if (buttonIndex === 1) {
                       handleImageUpload();
                   } else if (buttonIndex === 2) {
                       handleFileUpload();
                   }
               }
           );
       } else {
           setAttachmentMenuVisible(true);
       }
   };

   // Handle image upload from gallery
   const handleImageUpload = async () => {
       setAttachmentMenuVisible(false);
       try {
           const result = await launchImageLibrary({
               mediaType: 'photo',
               quality: 0.8,
               maxWidth: 1920,
               maxHeight: 1920,
               selectionLimit: 1,
           });

           if (result.didCancel) {
               return;
           }

           if (result.errorCode) {
               Alert.alert(t.common?.error || 'Error', result.errorMessage || t.messaging?.pickImageFailed || 'Failed to pick image');
               return;
           }

           if (result.assets && result.assets.length > 0) {
               const imageAsset = result.assets[0];
               const file = {
                   uri: imageAsset.uri,
                   type: imageAsset.type || 'image/jpeg',
                   name: imageAsset.fileName || `image_${Date.now()}.jpg`,
                   size: imageAsset.fileSize,
               };

               await uploadAndSendAttachment(file);
           }
       } catch (err) {
           Alert.alert(t.common?.error || 'Error', t.messaging?.pickImageFailed || 'Failed to pick image');
       }
   };

   // Handle file upload (PDF, documents)
   const handleFileUpload = async () => {
       setAttachmentMenuVisible(false);
       try {
           const results = await DocumentPicker.pick({
               type: [DocumentPicker.types.pdf],
           });

           const file = results[0];
           await uploadAndSendAttachment(file);
       } catch (err) {
           if (!DocumentPicker.isCancel(err)) {
               Alert.alert(t.common?.error || 'Error', t.messaging?.pickFileFailed || 'Failed to pick file');
           }
       }
   };

   // Common upload and send logic
   const uploadAndSendAttachment = async (file) => {
       // Validate file before upload
       const validation = validateFile(file, 'attachment');
       if (!validation.isValid) {
           Alert.alert(t.common?.error || 'Error', validation.error);
           return;
       }

       setIsUploadingAttachment(true);

       try {
           // Use secure upload function
           const uploadResponse = await uploadAttachment(file, {
               threadId,
           });


           // Send message with attachment - include both fileId (new) and url (legacy)
           const payload = {
               thread: threadId,
               body: '',
               attachment: {
                   fileId: uploadResponse?.fileId, // New secure field
                   url: uploadResponse?.url || '', // Legacy field for backward compatibility
                   size: file.size,
                   name: file.name,
                   type: file.type
               }
           };

           sendMessage(payload, {
               onSuccess: (data) => {
                   const savedMessage = data?.message || data;
                   setMessages(prev => [...prev, {
                     ...savedMessage,
                     sender: savedMessage?.sender || currentUser,
                   }]);
                   refetchMessages();
                   scrollToBottom();
               },
               onError: (err) => {
                   Alert.alert(t.common?.error || 'Error', t.messaging?.sendAttachmentFailed || 'Failed to send attachment');
               }
           });
       } catch (uploadErr) {
           Alert.alert(t.common?.error || 'Error', uploadErr.message || t.messaging?.uploadFileFailed || t.messaging?.fileUploadFailed || 'Failed to upload file');
       } finally {
           setIsUploadingAttachment(false);
       }
   };

   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   
   const renderMessageItem = ({ item }) => {
       // Check if I sent it
       const isMyMessage = isMessageFromUser(item, currentUser);

       const handleAttachmentPress = async () => {
           // Support both fileId (new secure) and url (legacy)
           const fileId = item.attachment?.fileId;
           const legacyUrl = item.attachment?.url;
           const fileName = item.attachment?.name || 'Attachment';

           if (!fileId && !legacyUrl) {
               Alert.alert(t.common?.error || 'Error', t.messaging?.noAttachment || 'No attachment available');
               return;
           }

           try {
               let documentUrl = legacyUrl;

               // If we have a fileId, fetch the private file
               if (fileId) {
                   try {
                       documentUrl = await getPrivateFileAsBase64(fileId);
                   } catch (fetchErr) {
                       // Fall back to legacy URL if available
                       if (!legacyUrl) {
                           Alert.alert(t.common?.error || 'Error', t.messaging?.loadAttachmentFailed || 'Failed to load attachment');
                           return;
                       }
                   }
               }

               if (documentUrl) {
                   // Check if it's an external URL (legacy) that can be opened with Linking
                   if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
                       const supported = await Linking.canOpenURL(documentUrl);
                       if (supported) {
                           await Linking.openURL(documentUrl);
                       } else {
                           Alert.alert(t.common?.error || 'Error', t.messaging?.cannotOpenFile || 'Cannot open this file');
                       }
                   } else {
                       // It's a base64 URL - display in DocumentViewer
                       const isImage = documentUrl.startsWith('data:image/');
                       const isPdf = documentUrl.startsWith('data:application/pdf');

                       const attachmentHtml = `
                           <!DOCTYPE html>
                           <html>
                           <head>
                               <meta charset="UTF-8">
                               <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
                               <style>
                                   * { margin: 0; padding: 0; box-sizing: border-box; }
                                   body {
                                       display: flex;
                                       justify-content: center;
                                       align-items: center;
                                       min-height: 100vh;
                                       background: #f5f5f5;
                                       padding: 10px;
                                   }
                                   img {
                                       max-width: 100%;
                                       height: auto;
                                       border-radius: 8px;
                                       box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                   }
                                   .pdf-container {
                                       width: 100%;
                                       height: 100vh;
                                   }
                                   iframe {
                                       width: 100%;
                                       height: 100%;
                                       border: none;
                                   }
                               </style>
                           </head>
                           <body>
                               ${isImage ? `<img src="${documentUrl}" alt="Attachment" />` :
                                 isPdf ? `<div class="pdf-container"><iframe src="${documentUrl}" title="PDF Attachment"></iframe></div>` :
                                 `<img src="${documentUrl}" alt="Attachment" />`}
                           </body>
                           </html>
                       `;

                       setAttachmentViewerContent(attachmentHtml);
                       setAttachmentViewerTitle(fileName);
                       setAttachmentViewerVisible(true);
                   }
               }
           } catch (error) {
               Alert.alert(t.common?.error || 'Error', t.messaging?.openAttachmentFailed || 'Failed to open attachment');
           }
       };

       return (
           <View style={[styles.msgRow, isRTL ? { alignSelf: isMyMessage ? 'flex-start' : 'flex-end' } : { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                  <View style={[
                    styles.bubble,
                    isMyMessage ? styles.bubbleSent : styles.bubbleReceived,
                    isMyMessage
                      ? (isRTL ? { borderTopLeftRadius: 0 } : { borderTopRightRadius: 0 })
                      : (isRTL ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }),
                  ]}>
                     {/* Show text first if exists */}
                     {item.body ? (
                        <Text style={isMyMessage ? styles.textSent : styles.textReceived}>{item.body}</Text>
                     ) : null}

                     {/* Show attachment after text - support both fileId (new) and url (legacy) */}
                     {(item.attachment?.fileId || item.attachment?.url) && (() => {
                        const fileName = item.attachment.name || (item.attachment.url ? item.attachment.url.split('/').pop() : 'Attachment');
                        const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                        const sizeLabel = formatFileSize(
                          item.attachment.size ?? getFileSize(item.attachment),
                        );

                        return (
                           <TouchableOpacity
                              style={[
                                 styles.attachmentContainer,
                                 item.body && { marginTop: 10 },
                                 isMyMessage && styles.attachmentContainerSent,
                              ]}
                              onPress={handleAttachmentPress}
                              activeOpacity={0.7}
                           >
                              <View style={[styles.attachmentIconContainer, isMyMessage && styles.attachmentIconContainerSent]}>
                                 <Text style={[styles.fileExtensionText, { color: COLORS.primary }]}>
                                    {fileExtension.length > 4 ? fileExtension.substring(0, 4) : fileExtension}
                                 </Text>
                              </View>
                              <View style={styles.attachmentMeta}>
                                 <Text
                                    numberOfLines={1}
                                    ellipsizeMode="middle"
                                    style={[styles.attachmentFileName, { color: isMyMessage ? COLORS.white : COLORS.textPrimary }]}
                                 >
                                    {fileName}
                                 </Text>
                                 <Text
                                    numberOfLines={1}
                                    style={[styles.attachmentFileSize, { color: isMyMessage ? 'rgba(255,255,255,0.75)' : COLORS.textSecondary }]}
                                 >
                                    {sizeLabel}
                                 </Text>
                              </View>
                              <Icon
                                 name={isRTL ? 'chevron-left' : 'chevron-right'}
                                 size={14}
                                 color={isMyMessage ? 'rgba(255,255,255,0.7)' : COLORS.gray400}
                                 style={styles.attachmentChevron}
                              />
                           </TouchableOpacity>
                        );
                     })()}
                  </View>
                  <Text style={[styles.timestamp, { alignSelf: isRTL ? (isMyMessage ? 'flex-start' : 'flex-end') : (isMyMessage ? 'flex-end' : 'flex-start') }]}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
           </View>
       );
   };

   // Custom Chat Header
   const ChatHeader = () => (
      <View style={[styles.header, rowStyle, { paddingTop: insets.top + 10 }]}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Image source={ICONS.back} style={[styles.icon, isRTL && { transform: [{ rotate: '180deg' }] }]} />
         </TouchableOpacity>
         <Image
           source={counterparty?.profileImage ? { uri: counterparty.profileImage } : ICONS.defaultAvatar}
           style={styles.headerAvatar}
           defaultSource={ICONS.defaultAvatar}
         />
         <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <AppText variant="bodyMedium" style={styles.headerName}>
              {counterpartyDisplayName || (isProviderViewer ? (t.messaging?.patient || 'Patient') : (t.messaging?.provider || 'Provider'))}
            </AppText>
            {/* Online status could be dynamic if we had socket presence events */}
         </View>
      </View>
   );

   if (threadsLoading && !hasValidThread) {
      return (
         <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
         </View>
      );
   }

   if (!hasValidThread) {
      return null;
   }

   return (
      <View style={styles.container}>
         <ChatHeader />

         {isLoadingMessages ? (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                 <ActivityIndicator size="large" color={COLORS.primary} />
             </View>
         ) : threadMessagesError ? (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                 <AppText variant="body" color={COLORS.gray500} align="center" style={{ marginBottom: 16 }}>
                   {t.messaging?.loadError || 'Could not load messages.'}
                 </AppText>
             </View>
         ) : (
             <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item, index) => item._id || index.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
             />
         )}

         {/* Footer Input */}
         <KeyboardAvoidingView
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
           keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
         >
            {isThreadExpired ? (
               <View style={styles.expiredBanner}>
                  <Icon name="clock" size={16} color={COLORS.gray500} />
                  <AppText variant="caption" color={COLORS.gray500} style={styles.expiredText}>
                     {t.messaging?.expiredBanner || 'You cannot send messages. Your last completed appointment must be within the past 30 days.'}
                  </AppText>
               </View>
            ) : (
               <View style={[styles.footer, rowStyle, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  <TouchableOpacity
                     style={styles.attachBtn}
                     onPress={showAttachmentOptions}
                     disabled={isUploadingAttachment}
                  >
                     {isUploadingAttachment ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                     ) : (
                        <Icon name="plus" size={20} color={COLORS.gray600} />
                     )}
                  </TouchableOpacity>
                  <TextInput
                     placeholder={t.messaging?.typingMessage || t.videoConsultation?.typeMessage || 'Type a message...'}
                     placeholderTextColor={COLORS.gray500}
                     style={[styles.chatInput, { textAlign: isRTL ? 'right' : 'left' }]}
                     value={inputText}
                     onChangeText={setInputText}
                     multiline
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                     <Image source={ICONS.send} style={{ width: 18, height: 18, tintColor: COLORS.white, marginLeft: isRTL ? 0 : 2, marginRight: isRTL ? 2 : 0 }} />
                  </TouchableOpacity>
               </View>
            )}
         </KeyboardAvoidingView>

         {/* Android Attachment Menu Modal */}
         <Modal
            visible={attachmentMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setAttachmentMenuVisible(false)}
         >
            <TouchableOpacity
               style={styles.attachmentMenuOverlay}
               activeOpacity={1}
               onPress={() => setAttachmentMenuVisible(false)}
            >
               <View style={[styles.attachmentMenuContainer, isRTL && { alignItems: 'flex-end' }]}>
                  <TouchableOpacity
                     style={[styles.attachmentMenuItem, rowStyle]}
                     onPress={handleImageUpload}
                  >
                     <Icon name="image" size={20} color={COLORS.primary} />
                     <AppText variant="body" style={styles.attachmentMenuText}>{t.messaging?.image || 'Image'}</AppText>
                  </TouchableOpacity>
                  <View style={styles.attachmentMenuDivider} />
                  <TouchableOpacity
                     style={[styles.attachmentMenuItem, rowStyle]}
                     onPress={handleFileUpload}
                  >
                     <Icon name="file-pdf" size={20} color={COLORS.danger} />
                     <AppText variant="body" style={styles.attachmentMenuText}>{t.messaging?.pdfFile || 'PDF File'}</AppText>
                  </TouchableOpacity>
                  <View style={styles.attachmentMenuDivider} />
                  <TouchableOpacity
                     style={[styles.attachmentMenuItem, rowStyle]}
                     onPress={() => setAttachmentMenuVisible(false)}
                  >
                     <Icon name="times" size={20} color={COLORS.gray500} />
                     <AppText variant="body" color={COLORS.gray500} style={styles.attachmentMenuText}>{t.messaging?.cancel || 'Cancel'}</AppText>
                  </TouchableOpacity>
               </View>
            </TouchableOpacity>
         </Modal>

         {/* Attachment Viewer Modal */}
         <DocumentViewer
            visible={attachmentViewerVisible}
            onClose={() => setAttachmentViewerVisible(false)}
            htmlContent={attachmentViewerContent}
            title={attachmentViewerTitle}
         />
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },

   // Header
   header: { backgroundColor: COLORS.white, paddingHorizontal: 15, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.gray200 },
   icon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
   headerAvatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10, backgroundColor: COLORS.gray200 },
   headerName: { fontWeight: 'bold' },
   headerStatus: { fontSize: 12, color: COLORS.success },

   // Messages
   msgRow: { maxWidth: '80%', marginBottom: 8 },
   bubble: { padding: 12, borderRadius: 14, minWidth: 0 },

   bubbleReceived: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray200 },
   textReceived: { color: COLORS.gray900, fontSize: 14 },

   bubbleSent: { backgroundColor: COLORS.primary },
   textSent: { color: COLORS.white, fontSize: 14 },

   timestamp: { fontSize: 10, color: COLORS.gray500, marginTop: 4 },

   // Attachment
   attachmentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      width: '100%',
      minWidth: 200,
      backgroundColor: COLORS.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
   },
   attachmentContainerSent: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderColor: 'rgba(255,255,255,0.25)',
   },
   attachmentIconContainer: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
   },
   attachmentIconContainerSent: {
      backgroundColor: 'rgba(255,255,255,0.92)',
   },
   fileExtensionText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.3,
   },
   attachmentMeta: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: SPACING.sm,
   },
   attachmentFileName: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
   },
   attachmentFileSize: {
      fontSize: 11,
   },
   attachmentChevron: {
      flexShrink: 0,
   },

   // Footer
   footer: { backgroundColor: COLORS.white, padding: 10, paddingBottom: 30, alignItems: 'center', borderTopWidth: 1, borderColor: COLORS.gray200 },
   attachBtn: { padding: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
   footerIcon: { width: 24, height: 24, tintColor: COLORS.gray500 },
   chatInput: { flex: 1, backgroundColor: COLORS.gray100, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 10, maxHeight: 100, color: COLORS.textPrimary },
   sendBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 3 },

   // Expired thread banner
   expiredBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.gray100,
      padding: 16,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderColor: COLORS.gray200,
      gap: 8,
   },
   expiredText: {
      textAlign: 'center',
      flex: 1,
   },

   // Attachment Menu (Android)
   attachmentMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
   },
   attachmentMenuContainer: {
      backgroundColor: COLORS.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
   },
   attachmentMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
   },
   attachmentMenuText: {
      marginHorizontal: 15,
   },
   attachmentMenuDivider: {
      height: 1,
      backgroundColor: COLORS.gray200,
   },
});

export default ChatDetailsScreen;