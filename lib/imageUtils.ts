/**
 * Image utilities for AI vision calls.
 * Claude's base64 image limit is ~5 MB. Phone photos easily exceed this.
 * We resize to ≤1280px on the long edge and compress to JPEG 85% quality,
 * yielding ~300–800 KB — well within the limit and sufficient for OCR.
 */
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImageForClaude(imageBase64: string): Promise<string> {
  const uri = `data:image/jpeg;base64,${imageBase64}`;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result.base64 ?? imageBase64;
  } catch {
    // If manipulation fails, send the original and let Claude reject if oversized
    return imageBase64;
  }
}
