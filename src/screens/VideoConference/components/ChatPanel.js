import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../../constants/colors';

const PRIMARY_COLOR = '#65bed6';

const ChatMessage = ({ message, isCurrentUser }) => {
  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor':
      case 'provider':
        return PRIMARY_COLOR;
      case 'patient':
        return '#9B59B6';
      case 'family':
        return '#3498DB';
      case 'guest':
        return '#8B5CF6';
      default:
        return '#95A5A6';
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.messageRight : styles.messageLeft,
      ]}
    >
      {!isCurrentUser && (
        <View style={styles.messageSenderRow}>
          <View
            style={[
              styles.senderDot,
              { backgroundColor: getRoleColor(message.role) },
            ]}
          />
          <Text style={styles.senderName}>{message.sender}</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
        ]}
      >
        <Text style={[styles.messageText, isCurrentUser && styles.messageTextWhite]}>
          {message.text}
        </Text>
      </View>
      <Text style={[styles.messageTime, isCurrentUser && styles.timeRight]}>
        {message.time}
      </Text>
    </View>
  );
};

const ChatPanel = ({
  isOpen,
  onClose,
  messages = [],
  participantCount,
  onSendMessage,
  currentUserName,
}) => {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
      Keyboard.dismiss();
    }
  };

  if (!isOpen) return null;

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="chat" size={20} color="white" />
            <Text style={styles.headerTitle}>
              {t('video_conference.chat', 'Chat')}
            </Text>
            <View style={styles.participantBadge}>
              <Text style={styles.participantText}>{participantCount}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>
                {t('video_conference.no_messages', 'No messages yet')}
              </Text>
              <Text style={styles.emptySubtext}>
                {t('video_conference.start_conversation', 'Start the conversation!')}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ChatMessage
                  message={item}
                  isCurrentUser={item.sender === currentUserName}
                />
              )}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('video_conference.type_message', 'Type a message...')}
              placeholderTextColor="#64748B"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim()}
            >
              <Icon name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PRIMARY_COLOR,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  participantBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  participantText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageLeft: {
    alignSelf: 'flex-start',
  },
  messageRight: {
    alignSelf: 'flex-end',
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  senderName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: PRIMARY_COLOR,
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextWhite: {
    color: 'white',
  },
  messageTime: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  timeRight: {
    textAlign: 'right',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#475569',
  },
});

export default ChatPanel;
