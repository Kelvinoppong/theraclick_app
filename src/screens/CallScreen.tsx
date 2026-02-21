/**
 * CallScreen — full-screen audio/video call UI.
 *
 * Handles both caller and receiver flows:
 *   - Caller: creates offer, waits for answer
 *   - Receiver: reads offer, creates answer
 *   - Both: exchange ICE candidates via Firestore
 *
 * UI: remote video fills screen, local video as small overlay,
 * audio-only shows avatar + pulse. Control bar at bottom.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import InCallManager from "react-native-incall-manager";

import {
  resetState,
  getLocalStream,
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  toggleMute,
  toggleCamera,
  switchCamera,
  cleanup,
} from "../services/webrtc";

import {
  subscribeToCall,
  subscribeToSignals,
  writeSignal,
  endCall,
  updateCallStatus,
  type CallType,
} from "../services/callStore";

import { useAuth } from "../context/AuthContext";
import { findOrCreateDmThread, sendDirectMessage } from "../services/messagingStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CALL_TIMEOUT_MS = 45_000; // 45 seconds before auto-ending unanswered calls

type Props = NativeStackScreenProps<any, "Call">;

export type CallScreenParams = {
  callId: string;
  callType: CallType;
  otherName: string;
  otherUid?: string;
  isCaller: boolean;
};

export function CallScreen({ route, navigation }: Props) {
  const params = route.params as CallScreenParams;
  const { callId, callType, otherName, otherUid, isCaller } = params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("connecting");
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const endedRef = useRef(false); // prevents double cleanup
  const [speakerOn, setSpeakerOn] = useState(true);

  // Start InCallManager for proper audio routing
  useEffect(() => {
    InCallManager.start({ media: "video", auto: false });
    InCallManager.setSpeakerphoneOn(true);

    return () => {
      InCallManager.setSpeakerphoneOn(false);
      InCallManager.stop();
    };
  }, []);

  // Re-assert speaker when call becomes active
  useEffect(() => {
    if (callStatus === "active") {
      setTimeout(() => {
        InCallManager.setSpeakerphoneOn(speakerOn);
      }, 500);
    }
  }, [callStatus]);

  // Pulse animation for audio-only or waiting state
  useEffect(() => {
    if (callType === "audio" || !remoteStream) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [callType, remoteStream]);

  // Monitor remote video track mute/unmute
  useEffect(() => {
    if (!remoteStream) return;
    const videoTrack = remoteStream.getVideoTracks()[0];
    if (!videoTrack) return;

    setRemoteCameraOff(!videoTrack.enabled);

    const onMute = () => setRemoteCameraOff(true);
    const onUnmute = () => setRemoteCameraOff(false);

    videoTrack.addEventListener("mute" as any, onMute);
    videoTrack.addEventListener("unmute" as any, onUnmute);

    return () => {
      videoTrack.removeEventListener("mute" as any, onMute);
      videoTrack.removeEventListener("unmute" as any, onUnmute);
    };
  }, [remoteStream]);

  // Call timer — starts when call becomes active
  useEffect(() => {
    if (callStatus === "active") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const handleEndCall = useCallback(async (writeToFirestore = true) => {
    if (endedRef.current) return; // prevent double cleanup
    endedRef.current = true;

    const finalElapsed = elapsed;
    const finalStatus = callStatus;

    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (writeToFirestore) {
      try {
        await endCall(callId);
      } catch {}
    }

    // Only the person who actively ends writes the call log (avoids duplicates)
    if (writeToFirestore && profile?.uid && otherUid) {
      try {
        const dmId = await findOrCreateDmThread(profile.uid, otherUid);
        const icon = callType === "video" ? "📹" : "📞";
        // senderId = caller's UID so it aligns to the right for the caller
        const callerUid = isCaller ? profile.uid : otherUid;
        let logText: string;

        if (finalStatus === "active" && finalElapsed > 0) {
          const mins = Math.floor(finalElapsed / 60);
          const secs = finalElapsed % 60;
          const duration = mins > 0
            ? `${mins}m ${secs}s`
            : `${secs}s`;
          logText = `${icon} ${callType === "video" ? "Video" : "Voice"} call · ${duration}`;
        } else if (finalStatus === "ringing" || finalStatus === "connecting") {
          logText = isCaller
            ? `${icon} Cancelled ${callType} call`
            : `${icon} Missed ${callType} call`;
        } else {
          logText = `${icon} ${callType === "video" ? "Video" : "Voice"} call ended`;
        }

        await sendDirectMessage(dmId, callerUid, logText);
      } catch (e) {
        console.warn("[Call] Failed to write call log:", e);
      }
    }

    InCallManager.stop();
    cleanup();
    setLocalStream(null);
    setRemoteStream(null);

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [callId, navigation, elapsed, callStatus, profile, otherUid, callType, isCaller]);

  // Main WebRTC setup
  useEffect(() => {
    if (!profile) return;

    // Reset module state from any previous call
    resetState();
    endedRef.current = false;

    let callUnsub: () => void;
    let signalUnsub: () => void;

    const setup = async () => {
      try {
        // Get local media FIRST so tracks are ready before peer connection
        const stream = await getLocalStream(callType);
        setLocalStream(stream);

        const pc = createPeerConnection(
          (candidate) => {
            console.log("[Call] ICE candidate generated");
            writeSignal(
              callId,
              profile.uid,
              "ice-candidate",
              JSON.stringify(candidate)
            );
          },
          (remoteStr) => {
            console.log("[Call] Remote stream received!", remoteStr?.toURL?.());
            setRemoteStream(remoteStr);
            setCallStatus("active");
          },
          (state) => {
            console.log("[Call] Connection state:", state);
            if (state === "disconnected") {
              setCallStatus("connecting");
            } else if (state === "connected" || state === "completed") {
              setCallStatus("active");
            } else if (state === "failed") {
              setCallStatus("failed");
            }
          }
        );
        console.log("[Call] Peer connection created, isCaller:", isCaller);

        if (isCaller) {
          const offerJson = await createOffer();
          await writeSignal(callId, profile.uid, "offer", offerJson);
          setCallStatus("ringing");

          // Auto-end if no answer within timeout
          timeoutRef.current = setTimeout(() => {
            if (!endedRef.current) {
              handleEndCall(true);
            }
          }, CALL_TIMEOUT_MS);
        }

        // Listen for signaling messages
        signalUnsub = subscribeToSignals(callId, async (signal) => {
          if (signal.senderId === profile.uid) return;
          console.log("[Call] Signal received:", signal.type);

          try {
            if (signal.type === "offer" && !isCaller) {
              console.log("[Call] Handling offer...");
              const answerJson = await handleOffer(signal.data);
              console.log("[Call] Answer created, sending...");
              await writeSignal(callId, profile.uid, "answer", answerJson);
              await updateCallStatus(callId, "active");
              console.log("[Call] Call set to active");
            } else if (signal.type === "answer" && isCaller) {
              console.log("[Call] Handling answer...");
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              await handleAnswer(signal.data);
              console.log("[Call] Answer handled");
            } else if (signal.type === "ice-candidate") {
              await addIceCandidate(signal.data);
            }
          } catch (e) {
            console.warn("Signal handling error:", e);
          }
        });

        // Listen for call status changes
        callUnsub = subscribeToCall(callId, (call) => {
          if (!call) return;
          if (call.status === "ended" || call.status === "missed") {
            handleEndCall(false);
          } else if (call.status === "active") {
            setCallStatus("active");
          }
        });
      } catch (e) {
        console.warn("WebRTC setup error:", e);
        setCallStatus("failed");
      }
    };

    setup();

    return () => {
      callUnsub?.();
      signalUnsub?.();
      if (!endedRef.current) {
        cleanup();
      }
    };
  }, []);

  const handleToggleMute = () => {
    const newVal = !muted;
    setMuted(newVal);
    toggleMute(newVal);
  };

  const handleToggleCamera = () => {
    const newVal = !cameraOff;
    setCameraOff(newVal);
    toggleCamera(newVal);
  };

  const handleToggleSpeaker = () => {
    const newVal = !speakerOn;
    setSpeakerOn(newVal);
    InCallManager.setSpeakerphoneOn(newVal);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isVideo = callType === "video";
  const showRemoteVideo = isVideo && remoteStream;
  const showLocalVideo = isVideo && localStream && !cameraOff;

  return (
    <View style={styles.container}>
      {showRemoteVideo && !remoteCameraOff ? (
        <RTCView
          streamURL={remoteStream!.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.audioContainer}>
          <Animated.View
            style={[
              styles.avatarPulse,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </Animated.View>
          <Text style={styles.callerName}>{otherName}</Text>
          <Text style={styles.statusText}>
            {remoteCameraOff && callStatus === "active"
              ? "Camera turned off"
              : callStatus === "ringing"
                ? "Ringing..."
                : callStatus === "connecting"
                  ? "Connecting..."
                  : callStatus === "active"
                    ? formatTime(elapsed)
                    : callStatus === "failed"
                      ? "Call failed"
                      : ""}
          </Text>
          {remoteCameraOff && callStatus === "active" && (
            <Text style={styles.timerBelowAvatar}>{formatTime(elapsed)}</Text>
          )}
        </View>
      )}

      {showLocalVideo && (
        <TouchableOpacity
          style={[styles.localVideoWrap, { top: insets.top + 10 }]}
          onPress={switchCamera}
          activeOpacity={0.9}
        >
          <RTCView
            streamURL={localStream!.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1}
            mirror
          />
        </TouchableOpacity>
      )}

      {showRemoteVideo && callStatus === "active" && (
        <View style={[styles.timerOverlay, { top: insets.top + 10 }]}>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
      )}

      <View style={[styles.controlBar, { bottom: Math.max(insets.bottom, 20) + 20 }]}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlIcon}>{muted ? "🔇" : "🎤"}</Text>
          <Text style={styles.controlLabel}>
            {muted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
            onPress={handleToggleCamera}
          >
            <Text style={styles.controlIcon}>
              {cameraOff ? "📷" : "📹"}
            </Text>
            <Text style={styles.controlLabel}>
              {cameraOff ? "Camera On" : "Camera Off"}
            </Text>
          </TouchableOpacity>
        )}

        {isVideo && (
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={switchCamera}
          >
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlBtn, speakerOn && styles.controlBtnActive]}
          onPress={handleToggleSpeaker}
        >
          <Text style={styles.controlIcon}>{speakerOn ? "🔊" : "🔈"}</Text>
          <Text style={styles.controlLabel}>
            {speakerOn ? "Speaker" : "Earpiece"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallBtn}
          onPress={() => handleEndCall(true)}
        >
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  remoteVideo: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPulse: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(22, 163, 74, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  callerName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  statusText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  timerBelowAvatar: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  localVideoWrap: {
    position: "absolute",
    right: 16,
    width: 110,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  timerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  controlBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  controlIcon: {
    fontSize: 22,
  },
  controlLabel: {
    fontSize: 9,
    color: "#FFFFFF",
    marginTop: 2,
    fontWeight: "600",
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  endCallIcon: {
    fontSize: 22,
    transform: [{ rotate: "135deg" }],
  },
  endCallLabel: {
    fontSize: 9,
    color: "#FFFFFF",
    marginTop: 2,
    fontWeight: "600",
  },
});
