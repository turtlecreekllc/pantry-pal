import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchProductImages, ImageSearchResult } from '../lib/imageSearchService';
import { colors, typography, spacing, borderRadius } from '../lib/theme';

interface ImageSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  searchQuery: string;
  brand?: string;
  size?: string;
}

/**
 * Modal for searching and selecting product images from the internet
 */
/**
 * Builds an optimized search query from brand, product name, and size
 */
function buildSearchQuery(productName: string, brand?: string, size?: string): string {
  const parts: string[] = [];
  if (brand?.trim()) {
    parts.push(brand.trim());
  }
  if (productName?.trim()) {
    parts.push(productName.trim());
  }
  if (size?.trim()) {
    parts.push(size.trim());
  }
  return parts.join(' ');
}

export function ImageSearchModal({
  visible,
  onClose,
  onSelectImage,
  searchQuery,
  brand,
  size,
}: ImageSearchModalProps): React.ReactElement {
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const fullSearchQuery = buildSearchQuery(searchQuery, brand, size);

  useEffect(() => {
    if (visible && fullSearchQuery.trim()) {
      performSearch();
    }
  }, [visible, fullSearchQuery]);

  const performSearch = async (): Promise<void> => {
    setIsSearching(true);
    setHasSearched(false);
    try {
      const searchResults = await searchProductImages(fullSearchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Image search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleSelectImage = (imageUrl: string): void => {
    onSelectImage(imageUrl);
    onClose();
  };

  const handleClose = (): void => {
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Product Image</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.brown} />
            </TouchableOpacity>
          </View>
          <Text style={styles.searchingFor} numberOfLines={1}>
            Searching for "{fullSearchQuery}"
          </Text>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Finding images...</Text>
            </View>
          ) : hasSearched && results.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={colors.brownMuted} />
              <Text style={styles.emptyText}>No images found</Text>
              <Text style={styles.emptySubtext}>Try a different product name</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.url}-${index}`}
              numColumns={2}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.imageItem}
                  onPress={() => handleSelectImage(item.url)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <Text style={styles.imageTitle} numberOfLines={2}>
                    {item.title || 'Product Image'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

interface ImageSearchButtonProps {
  productName: string;
  onImageSelected: (imageUrl: string) => void;
  hasImage?: boolean;
  compact?: boolean;
  brand?: string;
  size?: string;
}

/**
 * Button to trigger image search - can be used inline on any screen
 */
export function ImageSearchButton({
  productName,
  onImageSelected,
  hasImage = false,
  compact = false,
  brand,
  size,
}: ImageSearchButtonProps): React.ReactElement {
  const [showModal, setShowModal] = useState(false);

  const handlePress = (): void => {
    if (!productName.trim()) {
      return;
    }
    setShowModal(true);
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={handlePress}
          disabled={!productName.trim()}
        >
          <Ionicons
            name="search"
            size={16}
            color={productName.trim() ? colors.success : colors.brownMuted}
          />
          <Text
            style={[
              styles.compactButtonText,
              !productName.trim() && styles.compactButtonTextDisabled,
            ]}
          >
            {hasImage ? 'Change' : 'Find'} Photo
          </Text>
        </TouchableOpacity>
        <ImageSearchModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSelectImage={onImageSelected}
          searchQuery={productName}
          brand={brand}
          size={size}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, !productName.trim() && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={!productName.trim()}
      >
        <Ionicons
          name="globe-outline"
          size={20}
          color={productName.trim() ? colors.success : colors.brownMuted}
        />
        <View style={styles.buttonContent}>
          <Text
            style={[
              styles.buttonTitle,
              !productName.trim() && styles.buttonTitleDisabled,
            ]}
          >
            {hasImage ? 'Find Different Photo' : 'Find Product Photo'}
          </Text>
          <Text style={styles.buttonSubtitle}>
            Search the internet for an image
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={productName.trim() ? colors.brownMuted : colors.creamDark}
        />
      </TouchableOpacity>
      <ImageSearchModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSelectImage={onImageSelected}
        searchQuery={productName}
        brand={brand}
        size={size}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.brown,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space4,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl - 2,
    borderTopRightRadius: borderRadius.xl - 2,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingFor: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    padding: spacing.space8,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space3,
  },
  emptyContainer: {
    padding: spacing.space8,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginTop: spacing.space3,
  },
  emptySubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  grid: {
    padding: spacing.space3,
  },
  imageItem: {
    flex: 1,
    margin: spacing.space2,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.creamDark,
  },
  imageTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    padding: spacing.space2,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space3,
    gap: spacing.space3,
  },
  buttonDisabled: {
    borderColor: colors.creamDark,
    backgroundColor: colors.creamDark,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  buttonTitleDisabled: {
    color: colors.brownMuted,
  },
  buttonSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
  },
  compactButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.success,
  },
  compactButtonTextDisabled: {
    color: colors.brownMuted,
  },
});

