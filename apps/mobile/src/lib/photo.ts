import type { Customer } from '@baki/shared';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

export type PickedPhoto = { uri: string; mimeType: string };

/** Opens the camera or gallery for a square, compressed customer photo. Returns null if cancelled or denied. */
export async function pickPhoto(source: 'camera' | 'gallery'): Promise<PickedPhoto | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType && /^image\/(jpeg|png|webp)$/.test(asset.mimeType) ? asset.mimeType : 'image/jpeg';
  return { uri: asset.uri, mimeType };
}

export async function uploadCustomerPhoto(customerId: number, photo: PickedPhoto) {
  const form = new FormData();
  const ext = photo.mimeType.split('/')[1].replace('jpeg', 'jpg');
  // React Native's FormData accepts a { uri, name, type } file descriptor.
  form.append('photo', { uri: photo.uri, name: `photo.${ext}`, type: photo.mimeType } as unknown as Blob);
  return api<{ customer: Customer }>(`/owner/customers/${customerId}/photo`, { method: 'POST', form });
}
