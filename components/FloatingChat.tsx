/**
 * Floating Chat Component
 * A contextual AI chat overlay that appears above the current screen.
 * Allows users to discuss what they're viewing without navigating away.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  FlatList,
  ActivityIndicator,
  Image,
  Pressable,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePantry } from '../hooks/usePantry';
import { useHouseholdContext } from '../context/HouseholdContext';
import { sendChatMessage } from '../lib/chatService';
import { submitAIFeedback } from '../lib/aiFeedbackService';
import { ChatMessage, PantryItem, MealPlan, AIFeedbackRating } from '../lib/types';
import { ScreenContext } from '../lib/pepperContext';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

const MascotImage = require('../assets/icon.png');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContextualPrompt {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  prompt: string;
}

interface FloatingChatProps {
  /** Whether the chat is visible */
  visible: boolean;
  /** Callback when chat is closed */
  onClose: () => void;
  /** Current screen context for tailored suggestions */
  context: ScreenContext;
  /** Optional contextual data to enhance AI responses */
  contextData?: {
    mealPlans?: MealPlan[];
    pantryItems?: PantryItem[];
    currentRecipe?: { name: string; id: string };
    selectedDate?: string;
  };
}

/**
 * Get contextual prompts based on the current screen
 */
function getContextualPrompts(context: ScreenContext, contextData?: FloatingChatProps['contextData']): ContextualPrompt[] {
  const basePrompts: Record<ScreenContext, ContextualPrompt[]> = {
    tonight: [
      { id: 'surprise', icon: 'sparkles', label: 'Surprise me', prompt: 'Surprise me with a dinner idea based on what I have!' },
      { id: 'quick', icon: 'time-outline', label: '30-min meal', prompt: 'What can I make in under 30 minutes with my pantry?' },
      { id: 'expiring', icon: 'alert-circle-outline', label: 'Use expiring', prompt: "What's expiring soon? Suggest a recipe to use it up." },
    ],
    plan: [
      { id: 'fill-week', icon: 'calendar-outline', label: 'Plan my week', prompt: 'Help me plan meals for the rest of this week using what I have.' },
      { id: 'variety', icon: 'shuffle-outline', label: 'Add variety', prompt: 'My meal plan needs more variety. Suggest some different cuisines or styles.' },
      { id: 'budget', icon: 'wallet-outline', label: 'Budget meals', prompt: 'Suggest budget-friendly meals I can make this week.' },
    ],
    pantry: [
      { id: 'inventory', icon: 'list-outline', label: 'What do I have?', prompt: 'Give me a quick summary of what I have in my pantry.' },
      { id: 'expiring', icon: 'warning-outline', label: "What's expiring?", prompt: "What items are expiring soon? What should I use first?" },
      { id: 'restock', icon: 'cart-outline', label: 'What to restock', prompt: 'Based on my usage, what should I restock soon?' },
    ],
    grocery: [
      { id: 'optimize', icon: 'analytics-outline', label: 'Optimize list', prompt: 'Help me optimize my grocery list by aisle and remove duplicates.' },
      { id: 'meal-based', icon: 'restaurant-outline', label: 'From meal plan', prompt: 'Generate a grocery list from my meal plan for this week.' },
      { id: 'essentials', icon: 'checkmark-circle-outline', label: 'Add essentials', prompt: 'What kitchen essentials am I running low on?' },
    ],
    recipe: [
      { id: 'substitutions', icon: 'swap-horizontal-outline', label: 'Substitutions', prompt: "What substitutions can I make for ingredients I don't have in this recipe?" },
      { id: 'scale', icon: 'resize-outline', label: 'Scale recipe', prompt: 'How do I scale this recipe for more or fewer servings?' },
      { id: 'tips', icon: 'bulb-outline', label: 'Cooking tips', prompt: 'Any tips for making this recipe turn out better?' },
    ],
    scan: [
      { id: 'organize', icon: 'folder-outline', label: 'Organize items', prompt: 'Help me organize these scanned items by category and location.' },
      { id: 'recipes', icon: 'book-outline', label: 'Recipe ideas', prompt: 'Based on what I just scanned, what meals can I make?' },
      { id: 'expiry', icon: 'time-outline', label: 'Set expiry', prompt: "What's the typical shelf life for these items?" },
    ],
    settings: [
      { id: 'help', icon: 'help-circle-outline', label: 'How to use', prompt: 'How do I get the most out of DinnerPlans AI?' },
      { id: 'preferences', icon: 'options-outline', label: 'Set preferences', prompt: 'Help me configure my dietary preferences and cooking style.' },
      { id: 'tips', icon: 'bulb-outline', label: 'Pro tips', prompt: 'What are some pro tips for using DinnerPlans effectively?' },
    ],
  };
  return basePrompts[context] || basePrompts.tonight;
}

/**
 * Get the welcome message based on context
 */
function getWelcomeMessage(context: ScreenContext): string {
  const messages: Record<ScreenContext, string> = {
    tonight: "What sounds good tonight? I can suggest recipes based on what you have!",
    plan: "Let's plan your meals! I can help fill in your calendar or suggest balanced options.",
    pantry: "I can help you understand what's in your pantry and how to use it.",
    grocery: "Need help with your grocery list? I can optimize it or suggest what to add.",
    recipe: "I can help with substitutions, scaling, or cooking tips for this recipe.",
    scan: "Great haul! I can help organize what you scanned or suggest recipes.",
    settings: "How can I help? Ask me anything about using DinnerPlans AI.",
  };
  return messages[context] || messages.tonight;
}

/**
 * Floating chat overlay component
 */
export function FloatingChat({
  visible,
  onClose,
  context,
  contextData,
}: FloatingChatProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems: hookPantryItems } = usePantry({ householdId: activeHousehold?.id });
  const pantryItems = contextData?.pantryItems || hookPantryItems;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, AIFeedbackRating>>({});
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const contextualPrompts = getContextualPrompts(context, contextData);
  const CHAT_HEIGHT = SCREEN_HEIGHT * 0.65;
  const MINIMIZED_HEIGHT = 70;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      // Reset messages when opening
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(context),
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      setIsMinimized(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, context, slideAnim]);

  const handleMinimize = useCallback((): void => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  const handleSend = useCallback(async (): Promise<void> => {
    if (!inputText.trim() || isLoading) return;
    Keyboard.dismiss();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    try {
      const response = await sendChatMessage(inputText.trim(), pantryItems, messages);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, pantryItems, messages]);

  const handlePromptPress = useCallback((prompt: string): void => {
    setInputText(prompt);
    // Trigger send after state update
    setTimeout(() => {
      const fakeEvent = { inputText: prompt };
      handleSendWithPrompt(prompt);
    }, 100);
  }, []);

  const handleSendWithPrompt = useCallback(async (prompt: string): Promise<void> => {
    if (!prompt.trim() || isLoading) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    try {
      const response = await sendChatMessage(prompt.trim(), pantryItems, messages);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, pantryItems, messages]);

  const handleRecipePress = useCallback((recipeId: string): void => {
    onClose();
    router.push(`/recipe/${recipeId}`);
  }, [onClose]);

  /**
   * Handle feedback submission for an AI message
   */
  const handleFeedback = useCallback(async (
    message: ChatMessage,
    rating: AIFeedbackRating
  ): Promise<void> => {
    // Find the user message that preceded this AI response
    const messageIndex = messages.findIndex((m) => m.id === message.id);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    if (!userMessage || userMessage.role !== 'user') return;
    // Optimistically update UI
    setMessageFeedback((prev) => ({ ...prev, [message.id]: rating }));
    // Submit feedback to backend
    await submitAIFeedback({
      messageId: message.id,
      userMessage: userMessage.content,
      aiResponse: message.content,
      rating,
      screenContext: context,
    }, activeHousehold?.id);
  }, [messages, context, activeHousehold?.id]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }): React.ReactElement => {
    const isUser = item.role === 'user';
    const isWelcome = item.id === 'welcome';
    const currentFeedback = messageFeedback[item.id];
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {!isUser && (
          <View style={styles.aiAvatarContainer}>
            <Image source={MascotImage} style={styles.aiAvatar} resizeMode="contain" />
          </View>
        )}
        <View style={styles.messageContent}>
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.content}</Text>
            {item.recipes && item.recipes.length > 0 && (
              <View style={styles.recipesContainer}>
                {item.recipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => handleRecipePress(recipe.id)}
                  >
                    {recipe.thumbnail ? (
                      <Image source={{ uri: recipe.thumbnail }} style={styles.recipeThumbnail} />
                    ) : (
                      <View style={[styles.recipeThumbnail, styles.recipeThumbnailPlaceholder]}>
                        <Ionicons name="restaurant-outline" size={20} color={colors.brownMuted} />
                      </View>
                    )}
                    <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.brownMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {/* Feedback buttons for AI messages (not welcome message) */}
          {!isUser && !isWelcome && (
            <View style={styles.feedbackContainer}>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  currentFeedback === 'positive' && styles.feedbackButtonActive,
                ]}
                onPress={() => handleFeedback(item, 'positive')}
                accessibilityLabel="Helpful response"
                accessibilityRole="button"
              >
                <Ionicons
                  name={currentFeedback === 'positive' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={14}
                  color={currentFeedback === 'positive' ? colors.success : colors.brownMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  currentFeedback === 'negative' && styles.feedbackButtonNegative,
                ]}
                onPress={() => handleFeedback(item, 'negative')}
                accessibilityLabel="Unhelpful response"
                accessibilityRole="button"
              >
                <Ionicons
                  name={currentFeedback === 'negative' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={14}
                  color={currentFeedback === 'negative' ? colors.coral : colors.brownMuted}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [handleRecipePress, handleFeedback, messageFeedback]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />
        {/* Chat Panel */}
        <Animated.View
          style={[
            styles.chatPanel,
            {
              transform: [{ translateY: slideAnim }],
              height: isMinimized ? MINIMIZED_HEIGHT : CHAT_HEIGHT,
              paddingBottom: isMinimized ? 0 : (insets.bottom || spacing.space3),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.minimizeButton} onPress={handleMinimize}>
              <Ionicons
                name={isMinimized ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.brown}
              />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatar}>
                <Image source={MascotImage} style={styles.headerAvatarImage} resizeMode="contain" />
              </View>
              <Text style={styles.headerTitle}>Ask Chef</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.brown} />
            </TouchableOpacity>
          </View>
          {!isMinimized && (
            <>
              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
                showsVerticalScrollIndicator={false}
              />
              {/* Loading indicator */}
              {isLoading && (
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              )}
              {/* Contextual prompts */}
              {messages.length <= 1 && !isLoading && (
                <View style={styles.promptsContainer}>
                  {contextualPrompts.map((prompt) => (
                    <TouchableOpacity
                      key={prompt.id}
                      style={styles.promptChip}
                      onPress={() => handlePromptPress(prompt.prompt)}
                    >
                      <Ionicons name={prompt.icon} size={16} color={colors.coral} />
                      <Text style={styles.promptChipText}>{prompt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask me anything..."
                  placeholderTextColor={colors.brownMuted}
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                >
                  <Ionicons name="send" size={18} color={colors.brown} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 35, 20, 0.4)',
  },
  chatPanel: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.white,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  minimizeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  messagesList: {
    padding: spacing.space3,
    paddingBottom: spacing.space2,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.space3,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    flex: 1,
  },
  aiAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brown,
    marginRight: spacing.space2,
    marginTop: 2,
    overflow: 'hidden',
  },
  aiAvatar: {
    width: 24,
    height: 24,
  },
  messageBubble: {
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
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
  messageText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    lineHeight: typography.textSm * 1.4,
  },
  userText: {
    color: colors.brown,
  },
  aiText: {
    color: colors.brown,
  },
  recipesContainer: {
    marginTop: spacing.space2,
    gap: spacing.space2,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    padding: spacing.space2,
    borderWidth: 1,
    borderColor: colors.brown,
    gap: spacing.space2,
  },
  recipeThumbnail: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  recipeThumbnailPlaceholder: {
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeName: {
    flex: 1,
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
  },
  typingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    fontStyle: 'italic',
  },
  promptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.coral,
    gap: spacing.space1,
  },
  promptChipText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.space3,
    paddingTop: spacing.space2,
    gap: spacing.space2,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    maxHeight: 80,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  sendButtonDisabled: {
    backgroundColor: colors.creamDark,
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: spacing.space1,
    marginTop: spacing.space1,
    marginLeft: spacing.space1,
  },
  feedbackButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.brownMuted,
  },
  feedbackButtonActive: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  feedbackButtonNegative: {
    backgroundColor: colors.coralLight,
    borderColor: colors.coral,
  },
});

export default FloatingChat;

