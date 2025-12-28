import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import { useRecipes } from '../../../hooks/useRecipes';
import { useSavedRecipes } from '../../../hooks/useSavedRecipes';
import { scaleIngredients, getSuggestedServings, ScaledIngredient } from '../../../lib/servingScaler';
import { convertMeasure, MeasurementSystem } from '../../../lib/unitConverter';
import { RecipeIngredient } from '../../../lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CookingTimer {
  id: string;
  label: string;
  duration: number; // seconds
  remaining: number; // seconds
  isRunning: boolean;
  stepIndex: number;
}

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedRecipe, loading, fetchRecipeDetails } = useRecipes();
  const { savedRecipes } = useSavedRecipes();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState(4);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('imperial');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse instructions into steps
  const steps = selectedRecipe?.instructions
    ?.split('\n')
    .filter(Boolean)
    .map((step) => step.trim()) || [];

  // Original and scaled ingredients
  const originalServings = selectedRecipe?.servings || 4;
  const ingredients = selectedRecipe?.ingredients || [];
  const scaledIngredients: ScaledIngredient[] = scaleIngredients(
    ingredients,
    originalServings,
    servings
  );

  // Keep screen awake
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  // Fetch recipe
  useEffect(() => {
    if (id) {
      fetchRecipeDetails(id);
    }
  }, [id]);

  // Set initial servings from recipe
  useEffect(() => {
    if (selectedRecipe?.servings) {
      setServings(selectedRecipe.servings);
    }
  }, [selectedRecipe?.servings]);

  // Timer tick
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.isRunning && timer.remaining > 0) {
            const newRemaining = timer.remaining - 1;
            if (newRemaining === 0) {
              handleTimerComplete(timer);
            }
            return { ...timer, remaining: newRemaining };
          }
          return timer;
        })
      );
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Load sound
  useEffect(() => {
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.log('Error setting audio mode:', error);
      }
    };
    loadSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const handleTimerComplete = async (timer: CookingTimer) => {
    // Vibrate
    Vibration.vibrate([500, 200, 500, 200, 500]);

    // Show alert
    Alert.alert(
      'Timer Complete!',
      `${timer.label} is done!`,
      [{ text: 'OK', onPress: () => removeTimer(timer.id) }]
    );
  };

  const addTimer = (minutes: number, label: string, stepIndex: number) => {
    const newTimer: CookingTimer = {
      id: `timer-${Date.now()}`,
      label,
      duration: minutes * 60,
      remaining: minutes * 60,
      isRunning: true,
      stepIndex,
    };
    setTimers((prev) => [...prev, newTimer]);
  };

  const toggleTimer = (timerId: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === timerId ? { ...t, isRunning: !t.isRunning } : t
      )
    );
  };

  const removeTimer = (timerId: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== timerId));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const handleExit = () => {
    if (timers.length > 0) {
      Alert.alert(
        'Active Timers',
        'You have active timers. Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Detect timers in step text
  const parseTimersFromStep = (step: string): { minutes: number; label: string }[] => {
    const results: { minutes: number; label: string }[] = [];

    // Match patterns like "5 minutes", "10-15 minutes", "1 hour"
    const timePatterns = [
      /(\d+)[-–]?\d*\s*(?:minute|min)s?/gi,
      /(\d+)\s*(?:hour)s?/gi,
    ];

    timePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(step)) !== null) {
        const value = parseInt(match[1]);
        const isHour = match[0].toLowerCase().includes('hour');
        const minutes = isHour ? value * 60 : value;

        if (minutes > 0 && minutes <= 180) {
          // Reasonable cooking time
          results.push({
            minutes,
            label: `Step ${currentStep + 1}: ${minutes} min`,
          });
        }
      }
    });

    return results;
  };

  const currentStepTimers = parseTimersFromStep(steps[currentStep] || '');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedRecipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (steps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Ionicons name="document-text-outline" size={48} color="#ff9800" />
          <Text style={styles.errorText}>No instructions available</Text>
          <Text style={styles.errorSubtext}>
            This recipe doesn't have step-by-step instructions.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getMeasure = (ingredient: ScaledIngredient): string => {
    const measure = ingredient.measure;
    if (measurementSystem === 'metric') {
      return convertMeasure(measure, 'metric');
    }
    return measure;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {selectedRecipe.name}
          </Text>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(!showSettings)}
          style={styles.headerButton}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Servings</Text>
            <View style={styles.servingControls}>
              <TouchableOpacity
                style={styles.servingButton}
                onPress={() => setServings(Math.max(1, servings - 1))}
              >
                <Ionicons name="remove" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <Text style={styles.servingValue}>{servings}</Text>
              <TouchableOpacity
                style={styles.servingButton}
                onPress={() => setServings(servings + 1)}
              >
                <Ionicons name="add" size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Units</Text>
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  measurementSystem === 'imperial' && styles.unitButtonActive,
                ]}
                onPress={() => setMeasurementSystem('imperial')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    measurementSystem === 'imperial' && styles.unitButtonTextActive,
                  ]}
                >
                  Imperial
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  measurementSystem === 'metric' && styles.unitButtonActive,
                ]}
                onPress={() => setMeasurementSystem('metric')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    measurementSystem === 'metric' && styles.unitButtonTextActive,
                  ]}
                >
                  Metric
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Active Timers */}
      {timers.length > 0 && (
        <View style={styles.timersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {timers.map((timer) => (
              <TouchableOpacity
                key={timer.id}
                style={[
                  styles.timerChip,
                  timer.remaining === 0 && styles.timerChipComplete,
                ]}
                onPress={() => toggleTimer(timer.id)}
                onLongPress={() => removeTimer(timer.id)}
              >
                <Ionicons
                  name={timer.isRunning ? 'pause' : 'play'}
                  size={14}
                  color={timer.remaining === 0 ? '#fff' : '#4CAF50'}
                />
                <Text
                  style={[
                    styles.timerChipText,
                    timer.remaining === 0 && styles.timerChipTextComplete,
                  ]}
                >
                  {formatTime(timer.remaining)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Step Navigation */}
        <View style={styles.stepNav}>
          <TouchableOpacity
            style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
            onPress={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <Ionicons
              name="chevron-back"
              size={32}
              color={currentStep === 0 ? '#ccc' : '#4CAF50'}
            />
          </TouchableOpacity>

          <ScrollView
            style={styles.stepContent}
            contentContainerStyle={styles.stepContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepText}>{steps[currentStep]}</Text>

            {/* Timer Suggestions */}
            {currentStepTimers.length > 0 && (
              <View style={styles.timerSuggestions}>
                {currentStepTimers.map((t, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.addTimerButton}
                    onPress={() => addTimer(t.minutes, t.label, currentStep)}
                  >
                    <Ionicons name="timer-outline" size={18} color="#4CAF50" />
                    <Text style={styles.addTimerText}>
                      Start {t.minutes} min timer
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentStep === steps.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={() => goToStep(currentStep + 1)}
            disabled={currentStep === steps.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={32}
              color={currentStep === steps.length - 1 ? '#ccc' : '#4CAF50'}
            />
          </TouchableOpacity>
        </View>

        {/* Step Dots */}
        <View style={styles.stepDots}>
          {steps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.stepDot, currentStep === index && styles.stepDotActive]}
              onPress={() => goToStep(index)}
            />
          ))}
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ingredientsButton}
          onPress={() => setShowIngredients(!showIngredients)}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={showIngredients ? '#fff' : '#4CAF50'}
          />
          <Text
            style={[
              styles.ingredientsButtonText,
              showIngredients && styles.ingredientsButtonTextActive,
            ]}
          >
            Ingredients
          </Text>
        </TouchableOpacity>

        {currentStep === steps.length - 1 ? (
          <TouchableOpacity style={styles.doneButton} onPress={handleExit}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.doneButtonText}>Done Cooking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => goToStep(currentStep + 1)}
          >
            <Text style={styles.nextButtonText}>Next Step</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Ingredients Sheet */}
      {showIngredients && (
        <View style={styles.ingredientsSheet}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.ingredientsTitle}>
              Ingredients ({servings} servings)
            </Text>
            <TouchableOpacity
              style={styles.closeIngredients}
              onPress={() => setShowIngredients(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.ingredientsList}>
            {scaledIngredients.map((ing, index) => (
              <TouchableOpacity
                key={index}
                style={styles.ingredientItem}
                onPress={() => toggleIngredient(index)}
              >
                <Ionicons
                  name={checkedIngredients.has(index) ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checkedIngredients.has(index) ? '#4CAF50' : '#666'}
                />
                <Text
                  style={[
                    styles.ingredientText,
                    checkedIngredients.has(index) && styles.ingredientTextChecked,
                  ]}
                >
                  {getMeasure(ing)} {ing.ingredient}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#222',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepIndicator: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  settingsPanel: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 15,
    color: '#fff',
  },
  servingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    minWidth: 30,
    textAlign: 'center',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unitButtonActive: {
    backgroundColor: '#4CAF50',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#999',
  },
  unitButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  timersBar: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  timerChipComplete: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  timerChipTextComplete: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  stepContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  stepContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 24,
    lineHeight: 36,
    color: '#fff',
    textAlign: 'center',
  },
  timerSuggestions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  addTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addTimerText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  stepDotActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#222',
    gap: 12,
  },
  ingredientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  ingredientsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  ingredientsButtonTextActive: {
    color: '#fff',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ingredientsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeIngredients: {
    padding: 4,
  },
  ingredientsList: {
    padding: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  ingredientTextChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
});
