import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  compact = false,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());
  const [viewMonth, setViewMonth] = useState((value || new Date()).getMonth());
  const [viewYear, setViewYear] = useState((value || new Date()).getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value || new Date());
    const resetDate = value || new Date();
    setViewMonth(resetDate.getMonth());
    setViewYear(resetDate.getFullYear());
    setShowPicker(false);
  };

  const setQuickDate = (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    setTempDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const handleDaySelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setTempDate(newDate);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    setShowYearPicker(false);
  };

  // Generate calendar days for the current view month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month's days
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

    // Next month's leading days
    const remainingCells = 42 - days.length; // 6 rows * 7 days
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

  // Generate year options (current year - 1 to current year + 5)
  const yearOptions = useMemo(() => {
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
      >
        <Ionicons name="calendar-outline" size={compact ? 16 : 20} color="#666" />
        <Text style={[styles.dateText, compact && styles.dateTextCompact, !value && styles.placeholder]}>
          {formatDate(value)}
        </Text>
        {value && !compact && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
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

            {/* Quick buttons */}
            <View style={styles.quickButtons}>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => setQuickDate(0)}
              >
                <Text style={styles.quickButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => setQuickDate(7)}
              >
                <Text style={styles.quickButtonText}>+1 Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => setQuickDate(30)}
              >
                <Text style={styles.quickButtonText}>+1 Month</Text>
              </TouchableOpacity>
            </View>

            {/* Month/Year Navigation */}
            <View style={styles.monthYearNav}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow}>
                <Ionicons name="chevron-back" size={24} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monthYearButton}
                onPress={() => setShowYearPicker(!showYearPicker)}
              >
                <Text style={styles.monthYearText}>
                  {MONTHS[viewMonth]} {viewYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow}>
                <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>

            {/* Year Picker Dropdown */}
            {showYearPicker && (
              <View style={styles.yearPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {yearOptions.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        year === viewYear && styles.yearOptionSelected,
                      ]}
                      onPress={() => handleYearSelect(year)}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          year === viewYear && styles.yearOptionTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Days of Week Header */}
            <View style={styles.daysOfWeekRow}>
              {DAYS_OF_WEEK.map((day) => (
                <Text key={day} style={styles.dayOfWeekText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
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

            {/* Selected Date Display */}
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
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
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
    marginBottom: 16,
  },
  containerCompact: {
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputContainerCompact: {
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  dateTextCompact: {
    flex: 0,
    fontSize: 14,
    marginLeft: 6,
  },
  placeholder: {
    color: '#999',
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  quickButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  quickButtonText: {
    fontSize: 14,
    color: '#666',
  },
  monthYearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrow: {
    padding: 8,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 4,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  yearPickerContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  yearOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  yearOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  yearOptionText: {
    fontSize: 14,
    color: '#666',
  },
  yearOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
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
    borderColor: '#4CAF50',
    borderRadius: 20,
  },
  calendarDaySelected: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayTextOtherMonth: {
    color: '#999',
  },
  calendarDayTextToday: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedDateDisplay: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
