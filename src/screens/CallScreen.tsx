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

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
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
  type CallType,
} from "../services/callStore";

import { useAuth } from "../context/AuthContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = NativeStackScreenProps<any, "Call">;

export type CallScreenParams = {
  callId: string;
  callType: CallType;
  otherName: string;
  isCaller: boolean;
};

export function CallScreen({ route, navigation }: Props) {
  const params = route.params as CallScreenParams;
  const { callId, callType, otherName, isCaller } = params;
  const { profile } = useAuth();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("connecting");
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Call timer
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

  // Main WebRTC setup
  useEffect(() => {
    if (!profile) return;

    let callUnsub: () => void;
    let signalUnsub: () => void;

    const setup = async () => {
      try {
        const stream = await getLocalStream(callType);
        setLocalStream(stream);

        const pc = createPeerConnection(
          (candidate) => {
            writeSignal(
              callId,
              profile.uid,
              "ice-candidate",
              JSON.stringify(candidate)
            );
          },
          (stream) => {
            setRemoteStream(stream);
            setCallStatus("active");
          }
        );

        if (isCaller) {
          const offerJson = await createOffer();
          await writeSignal(callId, profile.uid, "offer", offerJson);
          setCallStatus("ringing");
        }

        signalUnsub = subscribeToSignals(callId, async (signal) => {
          if (signal.senderId === profile.uid) return;

          if (signal.type === "offer" && !isCaller) {
            const answerJson = await handleOffer(signal.data);
            await writeSignal(callId, profile.uid, "answer", answerJson);
          } else if (signal.type === "answer" && isCaller) {
            await handleAnswer(signal.data);
          } else if (signal.type === "ice-candidate") {
            await addIceCandidate(signal.data);
          }
        });

        callUnsub = subscribeToCall(callId, (call) => {
          if (!call || call.status === "ended" || call.status === "missed") {
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
    };
  }, []);

  const handleEndCall = async (writeToFirestore = true) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (writeToFirestore) {
      try {
        await endCall(callId);
      } catch {}
    }

    cleanup();
    setLocalStream(null);
    setRemoteStream(null);

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

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
      {showRemoteVideo ? (
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
            {callStatus === "ringing"
              ? "Ringing..."
              : callStatus === "connecting"
                ? "Connecting..."
                : callStatus === "active"
                  ? formatTime(elapsed)
                  : callStatus === "failed"
                    ? "Call failed"
                    : ""}
          </Text>
        </View>
      )}

      {showLocalVideo && (
        <TouchableOpacity
          style={styles.localVideoWrap}
          onPress={switchCamera}
          activeOpacity={0.9}
        >
          <RTCView
            streamURL={localStream!.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror
          />
        </TouchableOpacity>
      )}

      {showRemoteVideo && callStatus === "active" && (
        <View style={styles.timerOverlay}>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
      )}

      <View style={styles.controlBar}>
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
  localVideoWrap: {
    position: "absolute",
    top: 60,
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
    top: 60,
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
    bottom: 40,
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
