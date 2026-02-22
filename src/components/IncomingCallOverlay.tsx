/**
 * IncomingCallOverlay — Google Meet-style "Join" banner.
 *
 * Rendered in App.tsx above all other content. Listens to Firestore
 * for calls where the current user is the receiver.
 *
 * Shows a slide-down card: "[Name] invited you to a call" with
 * Join and Dismiss buttons — no ringing, no vibration.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
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

export function IncomingCallOverlay() {
  const { profile } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallDoc | null>(null);
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeToIncomingCalls(profile.uid, (call) => {
      setIncomingCall(call);
    });
    return () => unsub();
  }, [profile?.uid]);

  // Dismiss if caller cancels
  useEffect(() => {
    if (!incomingCall) return;
    const unsub = subscribeToCall(incomingCall.id, (call) => {
      if (!call || call.status === "ended" || call.status === "missed") {
        setIncomingCall(null);
      }
    });
    return () => unsub();
  }, [incomingCall?.id]);

  // Slide in when banner appears
  useEffect(() => {
    if (incomingCall) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(-200);
    }
  }, [incomingCall]);

  const handleJoin = () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);

    navigationRef.current?.navigate("Call" as never, {
      callId: call.id,
      callType: call.type,
      otherName: call.callerName,
      otherUid: call.callerId,
      isCaller: false,
    } as never);
  };

  const handleDismiss = async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    await updateCallStatus(call.id, "ended");
    setIncomingCall(null);

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
      style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {incomingCall.callerName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.callerName} numberOfLines={1}>
            {incomingCall.callerName}
          </Text>
          <Text style={styles.inviteText}>
            invited you to a {isVideo ? "video" : "voice"} call
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  info: {
    flex: 1,
  },
  callerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  inviteText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  joinBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#16A34A",
  },
  joinText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
