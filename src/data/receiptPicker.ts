import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { PickedFile } from '../models/Receipt';

export type PickResult =
  | { ok: true; file: PickedFile }
  | { ok: false; reason: 'cancelled' | 'permission' };

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  return {
    uri: asset.uri,
    fileType: 'image',
    size: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function pickFromCamera(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
  return { ok: true, file: fromImageAsset(res.assets[0]) };
}

export async function pickFromLibrary(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'permission' };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
  return { ok: true, file: fromImageAsset(res.assets[0]) };
}

export async function pickPdf(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
  const a = res.assets[0];
  return {
    ok: true,
    file: {
      uri: a.uri,
      fileType: 'pdf',
      size: a.size ?? null,
      mimeType: a.mimeType ?? 'application/pdf',
    },
  };
}
