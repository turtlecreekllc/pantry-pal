/**
 * Help Screen - Support & FAQ
 * Features an interactive AI support chatbot alongside traditional help resources
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Button } from '../../components/ui/Button';
import { sendSupportMessage, getSupportPrompts } from '../../lib/supportChatService';
import { ChatMessage } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

const MascotImage = require('../../assets/icon.png');

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I scan items into my pantry?',
    answer:
      'Tap the scan icon in the bottom navigation, then choose to scan a barcode, receipt, or take a photo of your pantry shelf. Our AI will automatically identify and add items.',
  },
  {
    question: 'How does the expiration tracking work?',
    answer:
      'DinnerPlans uses product databases and AI to estimate expiration dates. You can manually adjust these dates by tapping on any item in your pantry.',
  },
  {
    question: 'Can I share my pantry with family members?',
    answer:
      'Yes! Create a household in Settings > Household, then invite family members via email. Everyone in the household can view and manage the shared pantry.',
  },
  {
    question: 'How do recipe suggestions work?',
    answer:
      'Our AI analyzes your pantry contents and suggests recipes that use ingredients you already have, prioritizing items that are expiring soon.',
  },
  {
    question: 'How do I import recipes from social media?',
    answer:
      'Use the share feature from Instagram, TikTok, or any website to send the recipe link to DinnerPlans. Our AI will extract the ingredients and instructions.',
  },
  {
    question: 'What happens when I mark a meal as completed?',
    answer:
      'When you complete a meal, DinnerPlans can automatically deduct the used ingredients from your pantry, keeping your inventory accurate.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'Subscriptions are managed through your device. On iOS, go to Settings > Apple ID > Subscriptions. On Android, go to Google Play Store > Subscriptions.',
  },
];

export default function HelpScreen(): React.ReactElement {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const suggestedPrompts = getSupportPrompts();

  useEffect(() => {
    if (chatMessages.length === 0 && isChatExpanded) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi there! 👋 I'm Pepper, your support assistant. I can help you with questions about using DinnerPlans, troubleshooting issues, or learning about features. What can I help you with today?",
        timestamp: new Date().toISOString(),
      };
      setChatMessages([welcomeMessage]);
    }
  }, [isChatExpanded, chatMessages.length]);

  const handleEmailSupport = (): void => {
    Linking.openURL('mailto:support@dinnerplans.app?subject=Support Request');
  };

  const handleSubmitFeedback = async (): Promise<void> => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert('Thank You!', 'Your feedback has been submitted.');
      setFeedbackText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFAQ = (index: number): void => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleSendChatMessage = async (): Promise<void> => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const response = await sendSupportMessage(chatInput.trim(), chatMessages);
      setChatMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Support chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or email support@dinnerplans.app for help.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePromptPress = (prompt: string): void => {
    setChatInput(prompt);
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }): React.ReactElement => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.chatMessageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Image source={MascotImage} style={styles.avatarImage} resizeMode="contain" />
          </View>
        )}
        <View style={[styles.chatBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.chatBubbleText, isUser ? styles.userBubbleText : styles.aiBubbleText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Platform.OS === 'ios' 
    ? Constants.expoConfig?.ios?.buildNumber 
    : Constants.expoConfig?.android?.versionCode;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* AI Support Chat Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat with Support</Text>
          <View style={styles.chatCard}>
            {!isChatExpanded ? (
              <TouchableOpacity 
                style={styles.chatPromptContainer}
                onPress={() => setIsChatExpanded(true)}
                accessibilityLabel="Open support chat"
                accessibilityRole="button"
              >
                <View style={styles.chatPromptHeader}>
                  <View style={styles.chatAvatarSmall}>
                    <Image source={MascotImage} style={styles.chatAvatarImage} resizeMode="contain" />
                  </View>
                  <View style={styles.chatPromptText}>
                    <Text style={styles.chatPromptTitle}>Ask Pepper</Text>
                    <Text style={styles.chatPromptSubtitle}>Get instant help with any question</Text>
                  </View>
                  <View style={styles.chatStartButton}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.white} />
                  </View>
                </View>
                <View style={styles.suggestedQuestionsCompact}>
                  {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.suggestedChip}
                      onPress={() => {
                        setIsChatExpanded(true);
                        setChatInput(prompt);
                      }}
                    >
                      <Text style={styles.suggestedChipText} numberOfLines={1}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.chatExpandedContainer}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderLeft}>
                    <View style={styles.chatAvatarSmall}>
                      <Image source={MascotImage} style={styles.chatAvatarImage} resizeMode="contain" />
                    </View>
                    <View>
                      <Text style={styles.chatHeaderTitle}>Pepper</Text>
                      <Text style={styles.chatHeaderSubtitle}>Support Assistant</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setIsChatExpanded(false)}
                    style={styles.minimizeButton}
                    accessibilityLabel="Minimize chat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-up" size={20} color={colors.brownMuted} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  ref={flatListRef}
                  data={chatMessages}
                  renderItem={renderChatMessage}
                  keyExtractor={(item) => item.id}
                  style={styles.chatMessagesList}
                  contentContainerStyle={styles.chatMessagesContent}
                  onContentSizeChange={() => {
                    if (chatMessages.length > 0) {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }
                  }}
                />
                {chatMessages.length === 1 && (
                  <View style={styles.suggestedQuestionsExpanded}>
                    <Text style={styles.suggestedQuestionsTitle}>Quick Questions:</Text>
                    <View style={styles.suggestedQuestionsGrid}>
                      {suggestedPrompts.map((prompt, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.suggestedQuestionButton}
                          onPress={() => handlePromptPress(prompt)}
                        >
                          <Text style={styles.suggestedQuestionText}>{prompt}</Text>
                          <Ionicons name="arrow-forward" size={14} color={colors.coral} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {isChatLoading && (
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.typingText}>Pepper is typing...</Text>
                  </View>
                )}
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Type your question..."
                    placeholderTextColor={colors.brownMuted}
                    multiline
                    maxLength={500}
                    editable={!isChatLoading}
                    onSubmitEditing={handleSendChatMessage}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!chatInput.trim() || isChatLoading) && styles.sendButtonDisabled]}
                    onPress={handleSendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    accessibilityLabel="Send message"
                    accessibilityRole="button"
                  >
                    <Ionicons name="send" size={18} color={colors.brown} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Email Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.contactItem} onPress={handleEmailSupport}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactSubtitle}>
                  Get help from our support team
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.card}>
            {FAQ_ITEMS.map((item, index) => (
              <View key={index}>
                {index > 0 && <View style={styles.faqDivider} />}
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(index)}
                  accessibilityLabel={item.question}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedFAQ === index }}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.brownMuted}
                  />
                </TouchableOpacity>
                {expandedFAQ === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Feedback</Text>
          <View style={styles.card}>
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>
                Help us improve DinnerPlans
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Tell us what you think, report bugs, or suggest features..."
                placeholderTextColor={colors.brownMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={feedbackText}
                onChangeText={setFeedbackText}
              />
              <Button
                title={isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                onPress={handleSubmitFeedback}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </View>

        {/* Feature Guides Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Guides</Text>
          <View style={styles.card}>
            {Platform.OS === 'ios' && (
              <>
                <TouchableOpacity
                  style={styles.resourceItem}
                  onPress={() => router.push('/settings/siri-help')}
                  accessibilityLabel="Siri Shortcuts Guide"
                  accessibilityRole="button"
                >
                  <Ionicons name="mic-circle-outline" size={22} color={colors.primary} />
                  <Text style={styles.resourceText}>Siri Shortcuts Guide</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.brownMuted} />
                </TouchableOpacity>
                <View style={styles.resourceDivider} />
              </>
            )}
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => router.push('/settings/integrations')}
              accessibilityLabel="Integrations"
              accessibilityRole="button"
            >
              <Ionicons name="apps-outline" size={22} color={colors.brown} />
              <Text style={styles.resourceText}>App Integrations</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brownMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://dinnerplans.app/privacy')}
              accessibilityLabel="Privacy Policy"
              accessibilityRole="link"
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brown} />
              <Text style={styles.resourceText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={16} color={colors.brownMuted} />
            </TouchableOpacity>
            <View style={styles.resourceDivider} />
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://dinnerplans.app/terms')}
              accessibilityLabel="Terms of Service"
              accessibilityRole="link"
            >
              <Ionicons name="document-text-outline" size={22} color={colors.brown} />
              <Text style={styles.resourceText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={16} color={colors.brownMuted} />
            </TouchableOpacity>
            <View style={styles.resourceDivider} />
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://dinnerplans.app')}
              accessibilityLabel="Website"
              accessibilityRole="link"
            >
              <Ionicons name="globe-outline" size={22} color={colors.brown} />
              <Text style={styles.resourceText}>Website</Text>
              <Ionicons name="open-outline" size={16} color={colors.brownMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>DinnerPlans</Text>
          <Text style={styles.appVersion}>Version {appVersion} ({buildNumber})</Text>
          <Text style={styles.copyright}>© 2024 DinnerPlans. All rights reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.space4,
    paddingBottom: spacing.space10,
  },
  section: {
    marginBottom: spacing.space6,
  },
  sectionTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.space2,
    marginLeft: spacing.space1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  chatCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  chatPromptContainer: {
    padding: spacing.space4,
  },
  chatPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    marginRight: spacing.space3,
  },
  chatAvatarImage: {
    width: 38,
    height: 38,
  },
  chatPromptText: {
    flex: 1,
  },
  chatPromptTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  chatPromptSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  chatStartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  suggestedQuestionsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.space3,
    gap: spacing.space2,
  },
  suggestedChip: {
    backgroundColor: colors.peachLight,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.brown,
    maxWidth: '48%',
  },
  suggestedChipText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    color: colors.brown,
  },
  chatExpandedContainer: {
    maxHeight: 450,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
    backgroundColor: colors.cream,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  chatHeaderSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  minimizeButton: {
    padding: spacing.space2,
  },
  chatMessagesList: {
    maxHeight: 220,
  },
  chatMessagesContent: {
    padding: spacing.space3,
  },
  chatMessageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.space3,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space2,
    borderWidth: 1,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 24,
    height: 24,
  },
  chatBubble: {
    padding: spacing.space3,
    borderRadius: borderRadius.lg,
    maxWidth: '100%',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  aiBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.sm,
  },
  chatBubbleText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    lineHeight: typography.textSm * 1.4,
  },
  userBubbleText: {
    color: colors.brown,
  },
  aiBubbleText: {
    color: colors.brown,
  },
  suggestedQuestionsExpanded: {
    paddingHorizontal: spacing.space3,
    paddingBottom: spacing.space3,
  },
  suggestedQuestionsTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  suggestedQuestionsGrid: {
    gap: spacing.space2,
  },
  suggestedQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
    padding: spacing.space3,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  suggestedQuestionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    flex: 1,
    marginRight: spacing.space2,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space3,
    paddingBottom: spacing.space2,
    gap: spacing.space2,
  },
  typingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    fontStyle: 'italic',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
    backgroundColor: colors.cream,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    marginRight: spacing.space2,
    maxHeight: 80,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  sendButtonDisabled: {
    backgroundColor: colors.creamDark,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.peachLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  contactSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space4,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginRight: spacing.space3,
  },
  faqDivider: {
    height: 1,
    backgroundColor: colors.creamDark,
  },
  faqAnswer: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space4,
  },
  faqAnswerText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    lineHeight: typography.textSm * 1.5,
  },
  feedbackContainer: {
    padding: spacing.space4,
  },
  feedbackLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  feedbackInput: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    minHeight: 100,
    marginBottom: spacing.space4,
    color: colors.brown,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
  },
  resourceText: {
    flex: 1,
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brown,
    marginLeft: spacing.space3,
  },
  resourceDivider: {
    height: 1,
    backgroundColor: colors.creamDark,
    marginLeft: 50,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.space6,
  },
  appName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brownMuted,
  },
  appVersion: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  copyright: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    opacity: 0.6,
    marginTop: spacing.space2,
  },
});
