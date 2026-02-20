/**
 * WebRTC peer connection wrapper — STUB for Expo Go.
 *
 * The real implementation requires `react-native-webrtc` (native module),
 * which only works in a development build. This stub provides the same
 * API surface but shows an alert instead of actually connecting.
 *
 * To enable real WebRTC:
 *   1. npx expo install react-native-webrtc @config-plugins/react-native-webrtc
 *   2. Add the plugin to app.json
 *   3. npx expo prebuild && npx expo run:android
 *   4. Replace this file with the real implementation
 */

export type CallType = "audio" | "video";

const STUB_WARNING =
  "Audio/video calls require a development build. Currently running in Expo Go (limited mode).";

export async function getLocalStream(_type: CallType): Promise<null> {
  console.warn(STUB_WARNING);
  return null;
}

export function createPeerConnection(
  _onIceCandidate: (candidate: any) => void,
  _onRemoteStream: (stream: any) => void
): null {
  console.warn(STUB_WARNING);
  return null;
}

export async function createOffer(): Promise<string> {
  throw new Error(STUB_WARNING);
}

export async function handleOffer(_offerJson: string): Promise<string> {
  throw new Error(STUB_WARNING);
}

export async function handleAnswer(_answerJson: string): Promise<void> {
  throw new Error(STUB_WARNING);
}

export async function addIceCandidate(_candidateJson: string): Promise<void> {}

export function toggleMute(_muted: boolean): void {}
export function toggleCamera(_off: boolean): void {}
export function switchCamera(): void {}

export function getStreams() {
  return { localStream: null, remoteStream: null };
}

export function cleanup(): void {}

/**
 * Flag indicating whether real WebRTC is available.
 * UI code checks this to show "coming soon" vs actual call controls.
 */
export const WEBRTC_AVAILABLE = false;
