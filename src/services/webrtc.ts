/**
 * WebRTC peer connection wrapper.
 *
 * Manages a single RTCPeerConnection lifecycle:
 *   - Local/remote media streams (audio + video)
 *   - SDP offer/answer creation
 *   - ICE candidate queuing (handles candidates arriving before remote description)
 *   - Cleanup
 *
 * Uses Google's free STUN servers for NAT traversal.
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export type CallType = "audio" | "video";

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let iceCandidateQueue: RTCIceCandidate[] = [];
let hasRemoteDescription = false;

export const WEBRTC_AVAILABLE = true;

/**
 * Reset all module state. Must be called before starting a new call
 * to avoid stale references from previous calls.
 */
export function resetState(): void {
  cleanup();
  iceCandidateQueue = [];
  hasRemoteDescription = false;
}

/* ─── Get local media stream ─── */

export async function getLocalStream(
  type: CallType
): Promise<MediaStream> {
  const constraints = {
    audio: true,
    video: type === "video" ? { facingMode: "user" } : false,
  };

  const stream = await mediaDevices.getUserMedia(constraints);
  localStream = stream as MediaStream;
  return localStream;
}

/* ─── Create peer connection ─── */

export function createPeerConnection(
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteStream: (stream: MediaStream) => void,
  onConnectionStateChange?: (state: string) => void
): RTCPeerConnection {
  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  peerConnection.addEventListener("icecandidate", (event: any) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  });

  // Monitor ICE connection state for drops/reconnects
  peerConnection.addEventListener("iceconnectionstatechange", () => {
    const state = peerConnection?.iceConnectionState || "unknown";
    console.log("[WebRTC] ICE connection state:", state);
    onConnectionStateChange?.(state);

    // Auto-recover: if ICE fails, try restarting
    if (state === "failed" && peerConnection) {
      console.log("[WebRTC] ICE failed, attempting restart...");
      peerConnection.restartIce?.();
    }
  });

  // Handle remote stream — accept new streams on renegotiation
  peerConnection.addEventListener("track", (event: any) => {
    const stream = event.streams?.[0] || event.stream;
    if (stream) {
      console.log("[WebRTC] Remote track received, kind:", event.track?.kind);
      remoteStream = stream;
      onRemoteStream(remoteStream);
    }
  });

  // Fallback for older react-native-webrtc versions
  (peerConnection as any).addEventListener("addstream", (event: any) => {
    if (event.stream) {
      console.log("[WebRTC] Remote stream received (addstream)");
      remoteStream = event.stream;
      onRemoteStream(remoteStream);
    }
  });

  // Add local tracks if stream is already available
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      console.log("[WebRTC] Adding local track:", track.kind);
      peerConnection!.addTrack(track, localStream!);
    });
  }

  return peerConnection;
}

/* ─── Create SDP offer (caller side) ─── */

export async function createOffer(): Promise<string> {
  if (!peerConnection) throw new Error("No peer connection");

  const offer = await peerConnection.createOffer({});
  await peerConnection.setLocalDescription(offer);
  return JSON.stringify(offer);
}

/* ─── Handle incoming SDP offer (receiver side) ─── */

export async function handleOffer(offerJson: string): Promise<string> {
  if (!peerConnection) throw new Error("No peer connection");

  const offer = JSON.parse(offerJson);
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  hasRemoteDescription = true;

  // Flush any ICE candidates that arrived before the remote description
  await flushIceCandidateQueue();

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return JSON.stringify(answer);
}

/* ─── Handle incoming SDP answer (caller side) ─── */

export async function handleAnswer(answerJson: string): Promise<void> {
  if (!peerConnection) throw new Error("No peer connection");

  const answer = JSON.parse(answerJson);
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(answer)
  );
  hasRemoteDescription = true;

  // Flush any ICE candidates that arrived before the remote description
  await flushIceCandidateQueue();
}

/* ─── Add ICE candidate from remote peer ─── */

export async function addIceCandidate(candidateJson: string): Promise<void> {
  if (!peerConnection) return;

  try {
    const candidate = new RTCIceCandidate(JSON.parse(candidateJson));

    if (hasRemoteDescription) {
      await peerConnection.addIceCandidate(candidate);
    } else {
      // Queue it — remote description hasn't been set yet
      iceCandidateQueue.push(candidate);
    }
  } catch (e) {
    console.warn("Failed to add ICE candidate:", e);
  }
}

/* ─── Flush queued ICE candidates ─── */

async function flushIceCandidateQueue(): Promise<void> {
  if (!peerConnection) return;

  const queued = [...iceCandidateQueue];
  iceCandidateQueue = [];

  for (const candidate of queued) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.warn("Failed to add queued ICE candidate:", e);
    }
  }
}

/* ─── Toggle mute (audio) ─── */

export function toggleMute(muted: boolean): void {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !muted;
  });
}

/* ─── Toggle camera (video) ─── */

export function toggleCamera(off: boolean): void {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((track) => {
    track.enabled = !off;
  });
}

/* ─── Switch front/back camera ─── */

export function switchCamera(): void {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack && typeof (videoTrack as any)._switchCamera === "function") {
    (videoTrack as any)._switchCamera();
  }
}

/* ─── Get current streams ─── */

export function getStreams() {
  return { localStream, remoteStream };
}

/* ─── Cleanup everything ─── */

export function cleanup(): void {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  remoteStream = null;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}
