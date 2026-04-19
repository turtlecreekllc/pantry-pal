import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;
const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

interface BackgroundRemovalResult {
  success: boolean;
  imageUri: string | null;
  error?: string;
}

/**
 * Removes the background from an image using the remove.bg API
 * @param imageUri - The local URI of the image to process
 * @returns The processed image URI with transparent/white background
 */
export async function removeBackground(imageUri: string): Promise<BackgroundRemovalResult> {
  if (!REMOVE_BG_API_KEY) {
    return {
      success: false,
      imageUri: null,
      error: 'Background removal API key not configured',
    };
  }
  try {
    const resizedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.PNG }
    );
    const base64Image = await FileSystem.readAsStringAsync(resizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const formData = new FormData();
    formData.append('image_file_b64', base64Image);
    formData.append('size', 'auto');
    formData.append('bg_color', 'FFFFFF');
    const response = await fetch(REMOVE_BG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Background removal API error:', errorText);
      return {
        success: false,
        imageUri: null,
        error: 'Failed to remove background. Please try again.',
      };
    }
    const resultBlob = await response.blob();
    const reader = new FileReader();
    const base64Result = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(resultBlob);
    });
    const outputUri = `${FileSystem.cacheDirectory}bg_removed_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(outputUri, base64Result, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      success: true,
      imageUri: outputUri,
    };
  } catch (error) {
    console.error('Background removal error:', error);
    return {
      success: false,
      imageUri: null,
      error: 'Failed to process image. Please try again.',
    };
  }
}

/**
 * Checks if background removal is available (API key configured)
 */
export function isBackgroundRemovalAvailable(): boolean {
  return Boolean(REMOVE_BG_API_KEY);
}

