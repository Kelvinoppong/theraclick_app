/**
 * WebRTC peer connection wrapper.
 *
 * Manages a single RTCPeerConnection lifecycle:
 *   - Local/remote media streams (audio + video)
 *   - SDP offer/answer creation
 *   - ICE candidate handling
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

export const WEBRTC_AVAILABLE = true;

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
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection {
  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  peerConnection.addEventListener("icecandidate", (event: any) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  });

  peerConnection.addEventListener("track", (event: any) => {
    if (event.streams && event.streams[0]) {
      remoteStream = event.streams[0];
      onRemoteStream(remoteStream);
    }
  });

  if (localStream) {
    localStream.getTracks().forEach((track) => {
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
}

/* ─── Add ICE candidate from remote peer ─── */

export async function addIceCandidate(candidateJson: string): Promise<void> {
  if (!peerConnection) return;

  try {
    const candidate = JSON.parse(candidateJson);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.warn("Failed to add ICE candidate:", e);
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
