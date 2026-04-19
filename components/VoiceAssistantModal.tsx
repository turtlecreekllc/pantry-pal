import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  Platform,
  ScrollView,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ScannedItem, Location, Unit, FillLevel } from '../lib/types';
import {
  processVoiceCommand,
  applyUpdatesToItem,
  generateItemSummary,
  generateItemDescription,
  getConfidenceBasedPrompt,
  getVoicePrompt,
  getHelpText,
  ItemUpdate,
  ReviewProgress,
} from '../lib/voiceAssistantService';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  item: ScannedItem;
  location: Location;
  onItemUpdate: (updatedItem: ScannedItem) => void;
  onLocationChange?: (location: Location) => void;
  onAccept: () => void;
  onReject: () => void;
  onGoBack?: () => void;
  progress?: ReviewProgress;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  updates?: ItemUpdate[];
}

const VOLUME_UNIT_LABELS: Record<Unit, string> = {
  oz: 'oz',
  lb: 'lb',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  cup: 'cups',
  item: 'items',
  tbsp: 'tbsp',
  tsp: 'tsp',
};

const FILL_LEVEL_LABELS: Record<FillLevel, string> = {
  full: 'Full',
  '3/4': '¾ Full',
  '1/2': 'Half Full',
  '1/4': '¼ Full',
  'almost-empty': 'Almost Empty',
};

const LOCATION_LABELS: Record<Location, string> = {
  pantry: 'Pantry',
  fridge: 'Fridge',
  freezer: 'Freezer',
};

// Inactivity timeout in milliseconds (per PRD: 5+ seconds)
const INACTIVITY_TIMEOUT = 8000;
// Session timeout in milliseconds (per PRD: 2 minutes)
const SESSION_TIMEOUT = 120000;

export function VoiceAssistantModal({
  visible,
  onClose,
  item,
  location,
  onItemUpdate,
  onLocationChange,
  onAccept,
  onReject,
  onGoBack,
  progress,
}: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentItem, setCurrentItem] = useState<ScannedItem>(item);
  const [currentLocation, setCurrentLocation] = useState<Location>(location);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [soundEffects, setSoundEffects] = useState<Record<string, Audio.Sound>>({});
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const soundRef = useRef<Audio.Sound | null>(null);
  // Use refs to track state for inactivity timer (avoids stale closures)
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const isProcessingRef = useRef(isProcessing);

  // Sync with parent item/location when they change
  useEffect(() => {
    setCurrentItem(item);
    setCurrentLocation(location);
  }, [item, location]);

  // Keep refs in sync with state for timer callbacks
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Request audio permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
        setHasPermission(false);
      }
    };
    if (visible) {
      requestPermissions();
    }
  }, [visible]);

  const addAssistantMessage = useCallback((content: string, updates?: ItemUpdate[]) => {
    setConversation((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content,
        updates,
      },
    ]);
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return;
    }
    try {
      setIsSpeaking(true);
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      // Configure audio mode for speaker output with proper volume
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'nova', // Friendly, warm voice
          response_format: 'mp3',
          speed: 1.0,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI TTS API error:', errorData);
        setIsSpeaking(false);
        return;
      }
      // Get audio data as base64
      const audioBlob = await response.blob();
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Extract base64 data from data URL
          const base64Content = base64.split(',')[1];
          resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      // Save to temp file
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
      const fileUri = `${cacheDir}tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Load and play audio at full volume
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        {
          shouldPlay: true,
          volume: 1.0,  // Full volume for clear audio
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );
      soundRef.current = sound;
      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsSpeaking(false);
          sound.unloadAsync().catch(console.error);
          soundRef.current = null;
          // Clean up temp file
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(console.error);
        }
      });
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  }, []);

  // Reset activity timer on any interaction
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      // Proactive assistance per PRD
      // Use refs to check current state (avoids stale closure values)
      if (visible && !isListeningRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        const timeoutPrompt = getVoicePrompt('timeout');
        addAssistantMessage(timeoutPrompt);
        speakText(timeoutPrompt);
      }
    }, INACTIVITY_TIMEOUT);
  }, [visible, addAssistantMessage, speakText]);

  // Session timeout handler
  useEffect(() => {
    if (visible) {
      sessionTimerRef.current = setTimeout(() => {
        const sessionTimeoutMsg = "It's been a while. I'll save your progress. Say 'continue' to keep reviewing or you can close this screen.";
        addAssistantMessage(sessionTimeoutMsg);
        speakText(sessionTimeoutMsg);
      }, SESSION_TIMEOUT);
    }
    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
    };
  }, [visible]);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
      // Clean up any playing sound
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
        soundRef.current = null;
      }
    };
  }, []);

  // Animate the microphone button when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening, pulseAnim, waveAnim]);

  // Welcome message when modal opens - with confidence-based prompt
  useEffect(() => {
    if (visible && conversation.length === 0) {
      const confidencePrompt = getConfidenceBasedPrompt({
        name: currentItem.name,
        brand: currentItem.brand,
        quantity: currentItem.quantity,
        unit: currentItem.unit,
        unitCount: currentItem.unitCount,
        volumeQuantity: currentItem.volumeQuantity,
        volumeUnit: currentItem.volumeUnit,
        location: currentLocation,
        fillLevel: currentItem.fillLevel,
        expirationDate: currentItem.expirationDate,
        category: currentItem.category,
        confidence: currentItem.confidence,
      });
      addAssistantMessage(confidencePrompt);
      speakText(confidencePrompt);
      resetActivityTimer();
    }
  }, [visible]);

  // Scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollViewRef.current && conversation.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation]);

  const addUserMessage = useCallback((content: string) => {
    setConversation((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content,
      },
    ]);
  }, []);

  const stopSpeaking = useCallback(async (): Promise<void> => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      soundRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Audio feedback - vibration haptics as fallback
  const playAudioFeedback = useCallback((type: 'approve' | 'skip' | 'error') => {
    // Use haptic feedback for now - audio files would require assets
    if (Platform.OS !== 'web') {
      switch (type) {
        case 'approve':
          Vibration.vibrate(50);
          break;
        case 'skip':
          Vibration.vibrate([0, 30, 30, 30]);
          break;
        case 'error':
          Vibration.vibrate([0, 100, 50, 100]);
          break;
      }
    }
  }, []);

  const startRecording = async () => {
    if (!hasPermission) {
      addAssistantMessage("I need microphone permission to hear you. Please grant permission in settings.");
      return;
    }
    try {
      await stopSpeaking();
      resetActivityTimer();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsListening(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
      addAssistantMessage("Sorry, I couldn't start listening. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsListening(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        await processAudioFile(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecording(null);
    }
  };

  const processAudioFile = async (uri: string) => {
    setIsProcessing(true);
    resetActivityTimer();
    try {
      const transcribedText = await transcribeAudio(uri);
      if (transcribedText) {
        setTranscript(transcribedText);
        addUserMessage(transcribedText);
        await handleVoiceCommand(transcribedText);
      } else {
        addAssistantMessage("I couldn't hear that clearly. Could you try again?");
        playAudioFeedback('error');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      addAssistantMessage("I couldn't understand that. Could you try again?");
      playAudioFeedback('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeAudio = async (uri: string): Promise<string | null> => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Whisper API error:', error);
        return null;
      }
      const data = await response.json();
      return data.text || null;
    } catch (error) {
      console.error('Transcription error:', error);
      return null;
    }
  };

  const handleVoiceCommand = async (text: string) => {
    resetActivityTimer();
    
    // Process with AI for intent classification
    try {
      const conversationHistory = conversation
        .filter((m) => m.role !== 'system')
        .slice(-6) // Keep last 6 messages for context
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await processVoiceCommand({
        transcript: text,
        currentItem: {
          name: currentItem.name,
          brand: currentItem.brand,
          quantity: currentItem.quantity,
          unit: currentItem.unit,
          unitCount: currentItem.unitCount,
          volumeQuantity: currentItem.volumeQuantity,
          volumeUnit: currentItem.volumeUnit,
          location: currentLocation,
          fillLevel: currentItem.fillLevel,
          expirationDate: currentItem.expirationDate,
          category: currentItem.category,
          confidence: currentItem.confidence,
        },
        conversationHistory,
        progress,
      });

      // Handle special actions
      switch (response.action) {
        case 'approve':
          playAudioFeedback('approve');
          addAssistantMessage(response.message);
          speakText("Added!");
          setTimeout(() => {
            onAccept();
            handleClose();
          }, 500);
          return;

        case 'skip':
          playAudioFeedback('skip');
          addAssistantMessage(response.message);
          speakText("Skipped.");
          setTimeout(() => {
            onReject();
            handleClose();
          }, 500);
          return;

        case 'describe':
          const description = await generateItemDescription({
            name: currentItem.name,
            brand: currentItem.brand,
            quantity: currentItem.quantity,
            unit: currentItem.unit,
            unitCount: currentItem.unitCount,
            volumeQuantity: currentItem.volumeQuantity,
            volumeUnit: currentItem.volumeUnit,
            location: currentLocation,
            fillLevel: currentItem.fillLevel,
            expirationDate: currentItem.expirationDate,
            category: currentItem.category,
            confidence: currentItem.confidence,
          });
          addAssistantMessage(description);
          speakText(description);
          return;

        case 'help':
          const helpText = getVoicePrompt('help');
          addAssistantMessage(helpText);
          speakText(helpText);
          return;

        case 'go_back':
          if (onGoBack) {
            addAssistantMessage(response.message);
            speakText("Going back.");
            setTimeout(() => {
              onGoBack();
              handleClose();
            }, 500);
          } else {
            addAssistantMessage("This is the first item. I can't go back further.");
            speakText("This is the first item.");
          }
          return;

        case 'exit':
          addAssistantMessage("Saving your progress. You can resume anytime.");
          speakText("Saved.");
          setTimeout(handleClose, 500);
          return;

        default:
          // Apply updates if any
          if (response.updates.length > 0) {
            const locationUpdate = response.updates.find((u) => u.field === 'location');
            if (locationUpdate && typeof locationUpdate.value === 'string') {
              const newLocation = locationUpdate.value as Location;
              setCurrentLocation(newLocation);
              if (onLocationChange) {
                onLocationChange(newLocation);
              }
            }
            const itemUpdates = response.updates.filter((u) => u.field !== 'location');
            if (itemUpdates.length > 0) {
              const updatedItem = applyUpdatesToItem(currentItem, itemUpdates);
              setCurrentItem(updatedItem);
              onItemUpdate(updatedItem);
            }
          }
          addAssistantMessage(response.message, response.updates);
          speakText(response.message);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      playAudioFeedback('error');
      addAssistantMessage("Sorry, something went wrong. Please try again.");
    }
  };

  const handleClose = async (): Promise<void> => {
    await stopSpeaking();
    if (recording) {
      recording.stopAndUnloadAsync().catch(console.error);
      setRecording(null);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }
    setIsListening(false);
    setConversation([]);
    setTranscript('');
    onClose();
  };

  const handleMicPress = () => {
    resetActivityTimer();
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getQuantityDisplay = () => {
    if (currentItem.unitCount && currentItem.volumeQuantity && currentItem.volumeUnit) {
      return `${currentItem.unitCount} × ${currentItem.volumeQuantity} ${VOLUME_UNIT_LABELS[currentItem.volumeUnit]}`;
    }
    if (currentItem.unitCount) {
      return `${currentItem.unitCount} ${currentItem.unitCount === 1 ? 'item' : 'items'}`;
    }
    return `${currentItem.quantity} ${VOLUME_UNIT_LABELS[currentItem.unit] || currentItem.unit}`;
  };

  const getConfidenceColor = () => {
    if (currentItem.confidence >= 0.9) return '#4CAF50';
    if (currentItem.confidence >= 0.7) return '#FFC107';
    return '#f44336';
  };

  const getConfidenceLabel = () => {
    if (currentItem.confidence >= 0.9) return 'High confidence';
    if (currentItem.confidence >= 0.7) return 'Medium confidence';
    return 'Low confidence';
  };

  // Suggestion chips based on PRD commands
  const suggestions = [
    { label: 'Yes, add it', command: 'yes' },
    { label: 'Skip', command: 'skip' },
    { label: 'Describe this', command: 'describe this' },
    { label: 'Help', command: 'help' },
    ...(onGoBack ? [{ label: 'Go back', command: 'go back' }] : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header with Progress */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Voice Review</Text>
            {progress && (
              <Text style={styles.headerSubtitle}>
                {progress.currentIndex + 1} of {progress.totalItems}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              addUserMessage('Help');
              handleVoiceCommand('help');
            }}
            style={styles.helpButton}
          >
            <Ionicons name="help-circle-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        {progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((progress.currentIndex + 1) / progress.totalItems) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressStatText}>
                <Ionicons name="checkmark-circle" size={12} color="#4CAF50" /> {progress.approvedCount} added
              </Text>
              <Text style={styles.progressStatText}>
                <Ionicons name="close-circle" size={12} color="#999" /> {progress.skippedCount} skipped
              </Text>
            </View>
          </View>
        )}

        {/* Item Card */}
        <View style={styles.itemCard}>
          {/* Confidence Badge */}
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() + '20' }]}>
            <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor() }]} />
            <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
              {getConfidenceLabel()} ({Math.round(currentItem.confidence * 100)}%)
            </Text>
          </View>

          <View style={styles.itemHeader}>
            <View style={styles.itemIcon}>
              <Ionicons name="cube" size={24} color="#4CAF50" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{currentItem.name}</Text>
              {currentItem.brand && (
                <Text style={styles.itemBrand}>{currentItem.brand}</Text>
              )}
            </View>
          </View>

          {/* Quantity Details - Prominently displayed per PRD */}
          <View style={styles.quantitySection}>
            <View style={styles.quantityRow}>
              <View style={styles.quantityItem}>
                <Ionicons name="layers-outline" size={18} color="#4CAF50" />
                <Text style={styles.quantityLabel}>Quantity</Text>
                <Text style={styles.quantityValue}>{getQuantityDisplay()}</Text>
              </View>
              {currentItem.fillLevel && (
                <View style={styles.quantityItem}>
                  <Ionicons name="water-outline" size={18} color="#2196F3" />
                  <Text style={styles.quantityLabel}>Fill</Text>
                  <Text style={styles.quantityValue}>{FILL_LEVEL_LABELS[currentItem.fillLevel]}</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{LOCATION_LABELS[currentLocation]}</Text>
              </View>
              {currentItem.expirationDate && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={16} color="#FF9800" />
                  <Text style={[styles.metaText, { color: '#FF9800' }]}>
                    {new Date(currentItem.expirationDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              )}
              {currentItem.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{currentItem.category}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.conversationContainer}
          contentContainerStyle={styles.conversationContent}
        >
          {conversation.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantIcon}>
                  <Ionicons name="sparkles" size={14} color="#4CAF50" />
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
              {message.updates && message.updates.length > 0 && (
                <View style={styles.updatesBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={styles.updatesText}>
                    Updated {message.updates.length} field{message.updates.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {isProcessing && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggestions - Per PRD command examples */}
        <View style={styles.suggestions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.label}
                style={styles.suggestionChip}
                onPress={() => {
                  addUserMessage(suggestion.command);
                  handleVoiceCommand(suggestion.command);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Voice Control */}
        <View style={styles.voiceControl}>
          {/* Listening indicator with waveform */}
          {isListening && (
            <View style={styles.listeningIndicator}>
              <Animated.View
                style={[
                  styles.waveBar,
                  { transform: [{ scaleY: Animated.add(0.3, Animated.multiply(waveAnim, 0.7)) }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  styles.waveBarTall,
                  { transform: [{ scaleY: Animated.add(0.5, Animated.multiply(waveAnim, 0.5)) }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { transform: [{ scaleY: Animated.add(0.4, Animated.multiply(waveAnim, 0.6)) }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  styles.waveBarTall,
                  { transform: [{ scaleY: Animated.add(0.6, Animated.multiply(waveAnim, 0.4)) }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { transform: [{ scaleY: Animated.add(0.3, Animated.multiply(waveAnim, 0.7)) }] },
                ]}
              />
            </View>
          )}

          {transcript && !isListening && (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                addUserMessage('Skip');
                handleVoiceCommand('skip');
              }}
            >
              <Ionicons name="close" size={24} color="#f44336" />
              <Text style={[styles.actionText, { color: '#f44336' }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={handleMicPress}
              disabled={isProcessing}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Ionicons
                    name={isListening ? 'stop' : 'mic'}
                    size={36}
                    color="#fff"
                  />
                )}
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                addUserMessage('Add this item');
                handleVoiceCommand('yes');
              }}
            >
              <Ionicons name="checkmark" size={24} color="#4CAF50" />
              <Text style={[styles.actionText, { color: '#4CAF50' }]}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {isListening
              ? 'Listening... Tap to stop'
              : isSpeaking
              ? 'Speaking...'
              : isProcessing
              ? 'Processing...'
              : 'Tap microphone to speak'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  helpButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  progressStatText: {
    fontSize: 11,
    color: '#666',
  },
  itemCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  quantitySection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  quantityItem: {
    alignItems: 'center',
    gap: 4,
  },
  quantityLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  conversationContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  conversationContent: {
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
    flex: 1,
  },
  updatesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  updatesText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  processingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  suggestions: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
  },
  voiceControl: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    height: 24,
    backgroundColor: '#f44336',
    borderRadius: 2,
  },
  waveBarTall: {
    height: 32,
  },
  transcriptContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: '100%',
  },
  transcriptText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: '#f44336',
    shadowColor: '#f44336',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },
});
