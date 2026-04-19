import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { sendChatMessage, getSuggestedPrompts } from '../../lib/chatService';
import { ChatMessage } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

const MascotImage = require('../../assets/icon.png');

export default function ChatScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems } = usePantry({ householdId: activeHousehold?.id });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const suggestedPrompts = getSuggestedPrompts(pantryItems);

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey there! I'm your AI cooking companion! I can help you discover recipes, suggest dinners based on what you have, track expiring items, and plan your week. What can I help with today?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSend = async (overrideText?: string): Promise<void> => {
    const text = (overrideText ?? inputText).trim();
    if (!text || isLoading) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    try {
      const response = await sendChatMessage(text, pantryItems, messages);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I ran into a problem. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptPress = (prompt: string): void => {
    handleSend(prompt);
  };

  const handleRecipePress = (recipeId: string): void => {
    router.push(`/recipe/${recipeId}`);
  };

  const renderMessage = ({ item }: { item: ChatMessage }): React.ReactElement => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {isUser ? (
            <Text style={[styles.messageText, styles.userText]}>{item.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          )}
          {item.recipes && item.recipes.length > 0 && (
            <View style={styles.recipesContainer}>
              <Text style={styles.recipesTitle}>Recipes I found:</Text>
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
                      <Ionicons name="restaurant-outline" size={24} color={colors.brownMuted} />
                    </View>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {item.items && item.items.length > 0 && (
            <View style={styles.itemsContainer}>
              {item.items.map((pantryItem) => {
                const isExpiringSoon = pantryItem.expiration_date
                  ? new Date(pantryItem.expiration_date).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
                  : false;
                return (
                  <View key={pantryItem.id} style={styles.itemChip}>
                    <View style={styles.itemChipContent}>
                      <Text style={styles.itemName}>{pantryItem.name}</Text>
                      <Text style={styles.itemQuantity}>{pantryItem.quantity} {pantryItem.unit}</Text>
                    </View>
                    {isExpiringSoon && (
                      <Ionicons name="warning" size={16} color={colors.warning} style={styles.warningIcon} />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
        <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      </View>
    );
  };

  const renderEmptyState = (): React.ReactElement | null => {
    if (messages.length > 0) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.pepperBadge}>
          <Image source={MascotImage} style={styles.mascotImage} resizeMode="contain" />
        </View>
        <Text style={styles.emptyTitle}>Chat with Chef</Text>
        <Text style={styles.emptySubtitle}>Your AI cooking companion! Ask me about recipes, what's expiring, or help planning meals.</Text>
        <View style={styles.suggestedPromptsContainer}>
          <Text style={styles.suggestedPromptsTitle}>Try asking:</Text>
          {suggestedPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptButton}
              onPress={() => handlePromptPress(prompt)}
            >
              <Text style={styles.promptText}>{prompt}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.coral} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.messagesListEmpty]}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />
      {isLoading && (
        <View style={styles.typingIndicator}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        </View>
      )}
      {messages.length > 0 && !isLoading && messages[messages.length - 1]?.role === 'assistant' && (
        <View style={styles.quickActions}>
          {suggestedPrompts.slice(0, 3).map((prompt, index) => (
            <Pressable
              key={index}
              style={styles.quickActionChip}
              onPress={() => handlePromptPress(prompt)}
            >
              <Text style={styles.quickActionText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || spacing.space2 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your pantry..."
          placeholderTextColor={colors.brownMuted}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Ionicons name="send" size={24} color={colors.brown} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const markdownStyles = {
  body: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    lineHeight: typography.textBase * 1.4,
  },
  strong: {
    fontFamily: 'Nunito-Bold',
    fontWeight: typography.fontBold as any,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    marginBottom: 2,
  },
  heading1: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold as any,
    color: colors.brown,
    marginBottom: 4,
  },
  heading2: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold as any,
    color: colors.brown,
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: colors.creamDark,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  messagesList: {
    padding: spacing.space4,
  },
  messagesListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space10,
  },
  pepperBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 90,
    height: 90,
  },
  emptyTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginTop: spacing.space4,
  },
  emptySubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space2,
    paddingHorizontal: spacing.space8,
  },
  suggestedPromptsContainer: {
    marginTop: spacing.space8,
    width: '100%',
    paddingHorizontal: spacing.space4,
  },
  suggestedPromptsTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.space4,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  promptText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    flex: 1,
  },
  messageContainer: {
    marginBottom: spacing.space4,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
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
  messageText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    lineHeight: typography.textBase * 1.4,
  },
  userText: {
    color: colors.brown,
  },
  aiText: {
    color: colors.brown,
  },
  timestamp: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
    marginHorizontal: spacing.space1,
  },
  recipesContainer: {
    marginTop: spacing.space3,
  },
  recipesTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    padding: spacing.space2,
    marginBottom: spacing.space2,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  recipeThumbnail: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.space3,
  },
  recipeThumbnailPlaceholder: {
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    flex: 1,
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.space2,
    gap: spacing.space2,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  itemChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  itemName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  itemQuantity: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  warningIcon: {
    marginLeft: spacing.space2,
  },
  typingIndicator: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space2,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    gap: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  typingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
  },
  quickActionChip: {
    backgroundColor: colors.peachLight,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickActionText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.brown,
  },
  input: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    marginRight: spacing.space2,
    maxHeight: 100,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  sendButtonDisabled: {
    backgroundColor: colors.creamDark,
  },
});
