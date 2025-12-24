import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem } from '../lib/types';

interface PantryItemCardProps {
  item: PantryItem;
  onPress: () => void;
}

export function PantryItemCard({ item, onPress }: PantryItemCardProps) {
  const getExpirationStatus = () => {
    if (!item.expiration_date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(item.expiration_date);
    expDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { color: '#f44336', text: 'Expired', icon: 'alert-circle' as const };
    } else if (diffDays === 0) {
      return { color: '#f44336', text: 'Expires today', icon: 'alert-circle' as const };
    } else if (diffDays <= 3) {
      return { color: '#FF9800', text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`, icon: 'warning' as const };
    } else if (diffDays <= 7) {
      return { color: '#FFC107', text: `${diffDays} days left`, icon: 'time' as const };
    }
    return { color: '#4CAF50', text: `${diffDays} days left`, icon: 'checkmark-circle' as const };
  };

  const expirationStatus = getExpirationStatus();

  const getLocationIcon = () => {
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
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="nutrition" size={32} color="#ccc" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.brand} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        <View style={styles.meta}>
          <View style={styles.badge}>
            <Ionicons name={getLocationIcon()} size={14} color="#666" />
            <Text style={styles.badgeText}>
              {item.location.charAt(0).toUpperCase() + item.location.slice(1)}
            </Text>
          </View>
          <Text style={styles.quantity}>
            x{item.quantity} {item.unit !== 'item' ? item.unit : ''}
          </Text>
        </View>
      </View>

      {expirationStatus && (
        <View style={[styles.expirationBadge, { backgroundColor: expirationStatus.color + '15' }]}>
          <Ionicons name={expirationStatus.icon} size={14} color={expirationStatus.color} />
          <Text style={[styles.expirationText, { color: expirationStatus.color }]}>
            {expirationStatus.text}
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
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
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
  },
  quantity: {
    fontSize: 12,
    color: '#666',
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    marginRight: 8,
  },
  expirationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 4,
  },
});
