import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeFilters, CUISINES, DIETS } from '../lib/types';

interface RecipeFiltersProps {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}

const DEFAULT_FILTERS: RecipeFilters = {
  cuisine: null,
  diet: null,
  maxTime: null,
  sortBy: 'matchScore',
  sortOrder: 'desc',
};

export function RecipeFiltersComponent({
  filters,
  onChange,
  searchText,
  onSearchTextChange,
}: RecipeFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.cuisine !== null ||
    filters.diet !== null ||
    filters.maxTime !== null ||
    filters.sortBy !== 'matchScore';

  const handleClearFilters = () => {
    onChange(DEFAULT_FILTERS);
  };

  const activeFilterCount = [
    filters.cuisine,
    filters.diet,
    filters.maxTime,
    filters.sortBy !== 'matchScore' ? filters.sortBy : null,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => onSearchTextChange('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={hasActiveFilters ? '#fff' : '#4CAF50'}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Cuisine</Text>
            <View style={styles.chipContainer}>
              {CUISINES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.chip,
                    filters.cuisine === cuisine && styles.chipSelected,
                  ]}
                  onPress={() =>
                    onChange({
                      ...filters,
                      cuisine: filters.cuisine === cuisine ? null : cuisine,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.cuisine === cuisine && styles.chipTextSelected,
                    ]}
                  >
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Diet</Text>
            <View style={styles.chipContainer}>
              {DIETS.map((diet) => (
                <TouchableOpacity
                  key={diet}
                  style={[
                    styles.chip,
                    filters.diet === diet && styles.chipSelected,
                  ]}
                  onPress={() =>
                    onChange({
                      ...filters,
                      diet: filters.diet === diet ? null : diet,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.diet === diet && styles.chipTextSelected,
                    ]}
                  >
                    {diet}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Max Cooking Time</Text>
            <View style={styles.timeOptions}>
              {[15, 30, 45, 60, 90].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.timeChip,
                    filters.maxTime === minutes && styles.chipSelected,
                  ]}
                  onPress={() =>
                    onChange({
                      ...filters,
                      maxTime: filters.maxTime === minutes ? null : minutes,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.maxTime === minutes && styles.chipTextSelected,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[
                { value: 'matchScore', label: 'Match Score' },
                { value: 'time', label: 'Cooking Time' },
                { value: 'name', label: 'Name' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    filters.sortBy === option.value && styles.sortOptionSelected,
                  ]}
                  onPress={() =>
                    onChange({
                      ...filters,
                      sortBy: option.value as RecipeFilters['sortBy'],
                    })
                  }
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      filters.sortBy === option.value && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filters.sortBy === option.value && (
                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff5722',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  clearText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  timeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOptions: {
    gap: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sortOptionSelected: {
    backgroundColor: '#e8f5e9',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
