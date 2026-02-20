/**
 * Media upload service — Firebase Storage.
 *
 * Handles uploading images, voice notes, and files from the device
 * to Firebase Storage. Returns the download URL for embedding in
 * Firestore documents (forum posts, DMs, etc.).
 *
 * Storage paths: community/{channelId}/{timestamp}_{filename}
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { storage, firebaseIsReady } from "./firebase";

export type MediaType = "image" | "voice" | "file";

export type MediaAttachment = {
  type: MediaType;
  uri: string;
  name: string;
  downloadUrl?: string;
};

/**
 * Upload a local file URI to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadMedia(
  localUri: string,
  storagePath: string
): Promise<string> {
  if (!firebaseIsReady || !storage) {
    throw new Error("Firebase Storage not configured");
  }

  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Pick an image from gallery or camera.
 */
export async function pickImage(
  source: "gallery" | "camera" = "gallery"
): Promise<MediaAttachment | null> {
  const permFn =
    source === "camera"
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

  const { status } = await permFn();
  if (status !== "granted") return null;

  const launchFn =
    source === "camera"
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

  const result = await launchFn({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.fileName || `photo_${Date.now()}.jpg`;

  return { type: "image", uri: asset.uri, name };
}

/**
 * Pick a document/file.
 */
export async function pickDocument(): Promise<MediaAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    type: "file",
    uri: asset.uri,
    name: asset.name || `file_${Date.now()}`,
  };
}

/**
 * Build a storage path for community uploads.
 */
export function buildStoragePath(
  channelId: string,
  fileName: string
): string {
  const ts = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `community/${channelId}/${ts}_${safeName}`;
}
