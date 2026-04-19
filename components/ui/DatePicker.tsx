import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  compact = false,
}: DatePickerProps): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());
  const [viewMonth, setViewMonth] = useState((value || new Date()).getMonth());
  const [viewYear, setViewYear] = useState((value || new Date()).getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClear = (): void => {
    onChange(null);
  };

  const handleConfirm = (): void => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = (): void => {
    setTempDate(value || new Date());
    const resetDate = value || new Date();
    setViewMonth(resetDate.getMonth());
    setViewYear(resetDate.getFullYear());
    setShowPicker(false);
  };

  const setQuickDate = (days: number): void => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setTempDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const handleDaySelect = (day: number): void => {
    const newDate = new Date(viewYear, viewMonth, day);
    setTempDate(newDate);
  };

  const handlePrevMonth = (): void => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (): void => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleYearSelect = (year: number): void => {
    setViewYear(year);
    setShowYearPicker(false);
  };

  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const days: CalendarDay[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday =
        today.getDate() === i &&
        today.getMonth() === viewMonth &&
        today.getFullYear() === viewYear;
      const isSelected =
        tempDate.getDate() === i &&
        tempDate.getMonth() === viewMonth &&
        tempDate.getFullYear() === viewYear;
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday,
        isSelected,
      });
    }
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }
    return days;
  }, [viewMonth, viewYear, tempDate]);

  const yearOptions = useMemo((): number[] => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {label && !compact && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.inputContainer, compact && styles.inputContainerCompact]}
        onPress={() => {
          const dateToUse = value || new Date();
          setTempDate(dateToUse);
          setViewMonth(dateToUse.getMonth());
          setViewYear(dateToUse.getFullYear());
          setShowPicker(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={label || 'Select date'}
      >
        <Ionicons name="calendar-outline" size={compact ? 16 : 20} color={colors.brownMuted} />
        <Text style={[styles.dateText, compact && styles.dateTextCompact, !value && styles.placeholder]}>
          {formatDate(value)}
        </Text>
        {value && !compact && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton} accessibilityLabel="Clear date">
            <Ionicons name="close-circle" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Expiration Date</Text>

            <View style={styles.quickButtons}>
              <TouchableOpacity style={styles.quickButton} onPress={() => setQuickDate(0)}>
                <Text style={styles.quickButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickButton} onPress={() => setQuickDate(7)}>
                <Text style={styles.quickButtonText}>+1 Week</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickButton} onPress={() => setQuickDate(30)}>
                <Text style={styles.quickButtonText}>+1 Month</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.monthYearNav}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow} accessibilityLabel="Previous month">
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monthYearButton}
                onPress={() => setShowYearPicker(!showYearPicker)}
              >
                <Text style={styles.monthYearText}>{MONTHS[viewMonth]} {viewYear}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.brownMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow} accessibilityLabel="Next month">
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showYearPicker && (
              <View style={styles.yearPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {yearOptions.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearOption, year === viewYear && styles.yearOptionSelected]}
                      onPress={() => handleYearSelect(year)}
                    >
                      <Text style={[styles.yearOptionText, year === viewYear && styles.yearOptionTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.daysOfWeekRow}>
              {DAYS_OF_WEEK.map((day) => (
                <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((dayInfo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !dayInfo.isCurrentMonth && styles.calendarDayOtherMonth,
                    dayInfo.isToday && styles.calendarDayToday,
                    dayInfo.isSelected && styles.calendarDaySelected,
                  ]}
                  onPress={() => {
                    if (dayInfo.isCurrentMonth) {
                      handleDaySelect(dayInfo.day);
                    }
                  }}
                  disabled={!dayInfo.isCurrentMonth}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !dayInfo.isCurrentMonth && styles.calendarDayTextOtherMonth,
                      dayInfo.isToday && styles.calendarDayTextToday,
                      dayInfo.isSelected && styles.calendarDayTextSelected,
                    ]}
                  >
                    {dayInfo.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateText}>
                {tempDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.space4,
  },
  containerCompact: {
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  inputContainerCompact: {
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: spacing.space3,
  },
  dateText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    marginLeft: spacing.space3,
  },
  dateTextCompact: {
    flex: 0,
    fontSize: typography.textSm,
    marginLeft: spacing.space2,
  },
  placeholder: {
    color: colors.brownMuted,
  },
  clearButton: {
    padding: spacing.space1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space5,
    width: '95%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.space4,
  },
  quickButton: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.peach,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.brown,
  },
  quickButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
  },
  monthYearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space3,
  },
  navArrow: {
    padding: spacing.space2,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    gap: spacing.space1,
  },
  monthYearText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  yearPickerContainer: {
    marginBottom: spacing.space3,
    paddingVertical: spacing.space2,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
  },
  yearOption: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    marginHorizontal: spacing.space1,
    borderRadius: borderRadius.full,
  },
  yearOptionSelected: {
    backgroundColor: colors.primary,
  },
  yearOptionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  yearOptionTextSelected: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: spacing.space2,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  calendarDaySelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  calendarDayText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
  },
  calendarDayTextOtherMonth: {
    color: colors.brownMuted,
  },
  calendarDayTextToday: {
    color: colors.primary,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  calendarDayTextSelected: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  selectedDateDisplay: {
    marginTop: spacing.space3,
    paddingVertical: spacing.space3,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  selectedDateText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.space3,
    marginTop: spacing.space4,
  },
  modalButton: {
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space5,
    borderRadius: borderRadius.md,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  cancelButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  confirmButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
});
