import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem, Unit } from '../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

const UNIT_LABELS: Record<Unit, string> = {
  item: 'item',
  oz: 'oz',
  lb: 'lb',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  cup: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
};

function formatUnit(unit: string, quantity: number): string {
  const label = UNIT_LABELS[unit as Unit] || unit;
  if (quantity !== 1 && (unit === 'item' || unit === 'cup')) {
    return label + 's';
  }
  return label;
}

interface ExpirationStatus {
  color: string;
  bgColor: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface PantryItemCardProps {
  item: PantryItem;
  onPress: () => void;
}

/**
 * Brand-styled pantry item card component
 */
export function PantryItemCard({ item, onPress }: PantryItemCardProps): React.ReactElement {
  const getExpirationStatus = (): ExpirationStatus | null => {
    if (!item.expiration_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(item.expiration_date);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { color: colors.error, bgColor: colors.errorBg, text: 'Expired', icon: 'alert-circle' };
    } else if (diffDays === 0) {
      return { color: colors.error, bgColor: colors.errorBg, text: 'Expires today', icon: 'alert-circle' };
    } else if (diffDays <= 3) {
      return { color: colors.warning, bgColor: colors.warningBg, text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`, icon: 'warning' };
    } else if (diffDays <= 7) {
      return { color: colors.warning, bgColor: colors.warningBg, text: `${diffDays} days left`, icon: 'time' };
    }
    return { color: colors.success, bgColor: colors.successBg, text: `${diffDays} days left`, icon: 'checkmark-circle' };
  };

  const expirationStatus = getExpirationStatus();

  const getLocationIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (item.location) {
      case 'fridge':
        return 'snow';
      case 'freezer':
        return 'cube';
      default:
        return 'file-tray-stacked';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.quantity} ${formatUnit(item.unit, item.quantity)}`}
    >
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="nutrition" size={32} color={colors.brownMuted} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.brand && (
          <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text>
        )}
        <View style={styles.meta}>
          <View style={styles.badge}>
            <Ionicons name={getLocationIcon()} size={14} color={colors.brownMuted} />
            <Text style={styles.badgeText}>
              {item.location.charAt(0).toUpperCase() + item.location.slice(1)}
            </Text>
          </View>
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>
              {item.quantity} {formatUnit(item.unit, item.quantity)}
            </Text>
          </View>
        </View>
      </View>

      {expirationStatus && (
        <View style={[styles.expirationBadge, { backgroundColor: expirationStatus.bgColor }]}>
          <Ionicons name={expirationStatus.icon} size={14} color={expirationStatus.color} />
          <Text style={[styles.expirationText, { color: expirationStatus.color }]}>
            {expirationStatus.text}
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.space3,
  },
  name: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  brand: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.space2,
    gap: spacing.space2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
    borderRadius: borderRadius.sm,
    gap: spacing.space1,
  },
  badgeText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  quantityText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
    borderRadius: borderRadius.full,
    gap: spacing.space1,
    marginRight: spacing.space2,
  },
  expirationText: {
    fontFamily: 'Nunito-Medium',
    fontSize: 11,
    fontWeight: typography.fontMedium,
  },
  chevron: {
    marginLeft: spacing.space1,
  },
});
