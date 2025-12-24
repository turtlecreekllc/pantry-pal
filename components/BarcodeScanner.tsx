import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onCancel: () => void;
}

export function BarcodeScanner({ onBarcodeScanned, onCancel }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBarCodeScanned = useCallback(({ data }: BarcodeScanningResult) => {
    // Debounce scanning to prevent duplicate reads
    if (scanned || data === lastScannedRef.current) {
      return;
    }

    lastScannedRef.current = data;
    setScanned(true);

    // Clear any existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    // Reset after delay to allow re-scanning
    scanTimeoutRef.current = setTimeout(() => {
      setScanned(false);
      lastScannedRef.current = null;
    }, 2000);

    onBarcodeScanned(data);
  }, [scanned, onBarcodeScanned]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#999" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Pantry Pal needs camera access to scan product barcodes.
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={styles.permissionButton} />
          <Button title="Cancel" onPress={onCancel} variant="secondary" style={styles.cancelButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['upc_a', 'upc_e', 'ean8', 'ean13', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Scan a barcode</Text>
            <TouchableOpacity
              style={styles.torchButton}
              onPress={() => setTorch(!torch)}
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-off'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {scanned && (
              <View style={styles.scanningIndicator}>
                <Text style={styles.scanningText}>Processing...</Text>
              </View>
            )}
          </View>

          <View style={styles.footerOverlay}>
            <Text style={styles.instructionText}>
              Position the barcode within the frame
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeButton: {
    padding: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  torchButton: {
    padding: 8,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 280,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanningIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  scanningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerOverlay: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    minWidth: 200,
  },
  cancelButton: {
    marginTop: 12,
    minWidth: 200,
  },
});
