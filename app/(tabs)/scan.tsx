import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BarcodeScanner } from '../../components/BarcodeScanner';
import { getProductByBarcode } from '../../lib/openFoodFacts';

export default function ScanScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const product = await getProductByBarcode(barcode);

      if (product) {
        // Product found - go to add screen with product info
        router.push({
          pathname: '/item/add',
          params: {
            barcode: product.barcode,
            name: product.name,
            brand: product.brand || '',
            imageUrl: product.imageUrl || '',
            nutrition: product.nutrition ? JSON.stringify(product.nutrition) : '',
          },
        });
      } else {
        // Product not found - offer manual entry
        Alert.alert(
          'Product Not Found',
          'This product was not found in the database. Would you like to add it manually?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsProcessing(false),
            },
            {
              text: 'Add Manually',
              onPress: () => {
                router.push({
                  pathname: '/item/manual',
                  params: { barcode },
                });
              },
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      Alert.alert(
        'Error',
        'Failed to look up product. Please try again or add manually.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsProcessing(false),
          },
          {
            text: 'Add Manually',
            onPress: () => {
              router.push({
                pathname: '/item/manual',
                params: { barcode },
              });
            },
          },
        ]
      );
      return;
    }

    setIsProcessing(false);
  }, [isProcessing, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
