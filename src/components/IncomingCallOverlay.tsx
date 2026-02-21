/**
 * IncomingCallOverlay — global modal shown when an incoming call is detected.
 *
 * Rendered in App.tsx above all other content. Listens to Firestore
 * for calls where the current user is the receiver.
 *
 * Displays caller name, call type, and Accept/Reject buttons.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Vibration,
} from "react-native";

import {
  subscribeToIncomingCalls,
  subscribeToCall,
  updateCallStatus,
  type CallDoc,
} from "../services/callStore";
import { useAuth } from "../context/AuthContext";
import { navigationRef } from "../navigation/navigationRef";
import { findOrCreateDmThread, sendDirectMessage } from "../services/messagingStore";

const { width: SCREEN_W } = Dimensions.get("window");

export function IncomingCallOverlay() {
  const { profile } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallDoc | null>(null);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Listen for incoming calls
  useEffect(() => {
    if (!profile?.uid) return;

    const unsub = subscribeToIncomingCalls(profile.uid, (call) => {
      setIncomingCall(call);
    });

    return () => unsub();
  }, [profile?.uid]);

  // Watch the call document — dismiss overlay if caller cancels
  useEffect(() => {
    if (!incomingCall) return;

    const unsub = subscribeToCall(incomingCall.id, (call) => {
      if (!call || call.status === "ended" || call.status === "missed") {
        setIncomingCall(null);
      }
    });

    return () => unsub();
  }, [incomingCall?.id]);

  // Slide in + vibrate when incoming call appears
  useEffect(() => {
    if (incomingCall) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();

      Vibration.vibrate([0, 500, 200, 500, 200, 500], false);

      return () => {
        loop.stop();
        Vibration.cancel();
      };
    } else {
      slideAnim.setValue(-300);
    }
  }, [incomingCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);

    // Don't set "active" here — CallScreen will set it after WebRTC handshake
    navigationRef.current?.navigate("Call" as never, {
      callId: call.id,
      callType: call.type,
      otherName: call.callerName,
      otherUid: call.callerId,
      isCaller: false,
    } as never);
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    await updateCallStatus(call.id, "ended");
    setIncomingCall(null);

    // Log missed call — senderId = caller so it shows on the caller's side
    if (profile?.uid && call.callerId) {
      try {
        const dmId = await findOrCreateDmThread(profile.uid, call.callerId);
        const icon = call.type === "video" ? "📹" : "📞";
        await sendDirectMessage(dmId, call.callerId, `${icon} Missed ${call.type} call`);
      } catch (e) {
        console.warn("[Overlay] Failed to log missed call:", e);
      }
    }
  };

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === "video";

  return (
    <Animated.View
      style={[
        styles.overlay,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {incomingCall.callerName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.callerName} numberOfLines={1}>
            {incomingCall.callerName}
          </Text>
          <Text style={styles.callType}>
            Incoming {isVideo ? "Video" : "Audio"} Call
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={handleReject}
          >
            <Text style={styles.btnIcon}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
          >
            <Text style={styles.btnIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  info: {
    flex: 1,
  },
  callerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  callType: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  btnIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
});
