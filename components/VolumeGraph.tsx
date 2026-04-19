import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Rect, Defs, Pattern, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface VolumeGraphProps {
  currentQuantity: number;
  originalQuantity: number | null;
  unit: string;
  onQuantityChange?: (newQuantity: number) => void;
  onOriginalQuantityChange?: (newOriginal: number) => void;
  onScanForEstimate?: () => void;
}

export function VolumeGraph({
  currentQuantity,
  originalQuantity,
  unit,
  onQuantityChange,
  onOriginalQuantityChange,
  onScanForEstimate,
}: VolumeGraphProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<View>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use original_quantity as 100% (package total), or current quantity if not set
  const total = originalQuantity || currentQuantity;
  const percentage = total > 0 ? Math.min(100, (currentQuantity / total) * 100) : 100;

  const getStatusColor = () => {
    if (percentage <= 20) return '#f44336';
    if (percentage <= 50) return '#FFC107';
    return '#4CAF50';
  };

  const getStatusText = () => {
    if (percentage <= 20) return 'Running Low';
    if (percentage <= 50) return 'Half Left';
    return 'Well Stocked';
  };

  const handleLayout = (event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isEditing,
    onMoveShouldSetPanResponder: () => isEditing,
    onPanResponderMove: (_, gestureState) => {
      if (!isEditing || containerWidth === 0 || !onQuantityChange) return;

      const newPercentage = Math.max(0, Math.min(100, (gestureState.moveX / containerWidth) * 100));
      const newQuantity = (newPercentage / 100) * total;
      const roundedQuantity = Math.round(newQuantity * 100) / 100;
      onQuantityChange(roundedQuantity);
    },
    onPanResponderRelease: () => {
      // Quantity already saved during move
    },
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleQuickAdjust = (amount: number) => {
    if (!onQuantityChange) return;
    const newQuantity = Math.max(0, Math.min(total, currentQuantity + amount));
    const roundedQuantity = Math.round(newQuantity * 100) / 100;
    onQuantityChange(roundedQuantity);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Remaining</Text>
        <View style={styles.headerActions}>
          <Text style={[styles.status, { color: getStatusColor() }]}>{getStatusText()}</Text>
          {onQuantityChange && (
            <TouchableOpacity
              style={[styles.editButton, isEditing && styles.editButtonActive]}
              onPress={handleEditToggle}
            >
              <Ionicons
                name={isEditing ? 'checkmark' : 'pencil'}
                size={16}
                color={isEditing ? '#fff' : '#666'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        ref={containerRef}
        style={styles.graphContainer}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={40}>
          <Defs>
            <Pattern
              id="hatch"
              patternUnits="userSpaceOnUse"
              width={8}
              height={8}
              patternTransform="rotate(45)"
            >
              <Line x1={0} y1={0} x2={0} y2={8} stroke={getStatusColor()} strokeWidth={2} />
            </Pattern>
          </Defs>

          {/* Background bar */}
          <Rect x={0} y={8} width="100%" height={24} rx={4} fill="#e0e0e0" />

          {/* Filled portion with hash pattern */}
          <Rect
            x={0}
            y={8}
            width={`${percentage}%`}
            height={24}
            rx={4}
            fill="url(#hatch)"
          />

          {/* Solid overlay */}
          <Rect
            x={0}
            y={8}
            width={`${percentage}%`}
            height={24}
            rx={4}
            fill={getStatusColor()}
            opacity={0.3}
          />

          {/* Drag handle when editing */}
          {isEditing && (
            <Rect
              x={`${percentage - 1}%`}
              y={4}
              width={8}
              height={32}
              rx={4}
              fill={getStatusColor()}
            />
          )}
        </Svg>

        {isEditing && (
          <Text style={styles.editHint}>Drag to adjust or use buttons below</Text>
        )}
      </View>

      {isEditing && (
        <View style={styles.quickAdjust}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAdjust(-(total * 0.25))}
          >
            <Text style={styles.quickButtonText}>-25%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAdjust(-(total * 0.1))}
          >
            <Text style={styles.quickButtonText}>-10%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAdjust(total * 0.1)}
          >
            <Text style={styles.quickButtonText}>+10%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAdjust(total * 0.25)}
          >
            <Text style={styles.quickButtonText}>+25%</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.currentValue}>
          {currentQuantity % 1 === 0 ? currentQuantity.toString() : currentQuantity.toFixed(2)} {unit}
        </Text>
        <Text style={styles.originalValue}>
          of {total % 1 === 0 ? total.toString() : total.toFixed(2)} {unit} ({Math.round(percentage)}%)
        </Text>
      </View>

      {isEditing && onOriginalQuantityChange && (
        <View style={styles.totalEditSection}>
          <Text style={styles.totalEditLabel}>Total capacity:</Text>
          <View style={styles.totalEditControls}>
            <TouchableOpacity
              style={styles.totalEditButton}
              onPress={() => {
                const newTotal = Math.max(currentQuantity, total - (total * 0.1));
                onOriginalQuantityChange(Math.round(newTotal * 100) / 100);
              }}
            >
              <Text style={styles.totalEditButtonText}>-10%</Text>
            </TouchableOpacity>
            <Text style={styles.totalEditValue}>
              {total % 1 === 0 ? total.toString() : total.toFixed(2)} {unit}
            </Text>
            <TouchableOpacity
              style={styles.totalEditButton}
              onPress={() => {
                const newTotal = total + (total * 0.1);
                onOriginalQuantityChange(Math.round(newTotal * 100) / 100);
              }}
            >
              <Text style={styles.totalEditButtonText}>+10%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.totalEditButton}
              onPress={() => {
                // Set total to current (reset to full)
                onOriginalQuantityChange(currentQuantity);
              }}
            >
              <Text style={styles.totalEditButtonText}>= Current</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {onScanForEstimate && (
        <TouchableOpacity style={styles.scanButton} onPress={onScanForEstimate}>
          <Ionicons name="camera-outline" size={18} color="#4CAF50" />
          <Text style={styles.scanButtonText}>Estimate with Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonActive: {
    backgroundColor: '#4CAF50',
  },
  graphContainer: {
    marginBottom: 8,
  },
  editHint: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  quickAdjust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  originalValue: {
    fontSize: 14,
    color: '#666',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  totalEditSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalEditLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  totalEditControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalEditButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  totalEditButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  totalEditValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
});
