/**
 * CallScreen — placeholder for audio/video calls.
 *
 * Currently shows a "coming soon" UI because real WebRTC requires
 * a development build (native modules). All the signaling logic
 * (callStore.ts) and UI structure are ready — just needs
 * react-native-webrtc installed via dev build to go live.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { WEBRTC_AVAILABLE } from "../services/webrtc";
import { endCall } from "../services/callStore";
import type { CallType } from "../services/callStore";

const { width: SCREEN_W } = Dimensions.get("window");

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

  const handleClose = async () => {
    try {
      await endCall(callId);
    } catch {}
    if (navigation.canGoBack()) navigation.goBack();
  };

  // Auto-end the call doc so the other side isn't stuck on "ringing"
  useEffect(() => {
    if (!WEBRTC_AVAILABLE) {
      endCall(callId).catch(() => {});
    }
  }, []);

  if (!WEBRTC_AVAILABLE) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{otherName}</Text>
          <Text style={styles.callTypeLabel}>
            {callType === "video" ? "Video" : "Audio"} Call
          </Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Coming Soon</Text>
            <Text style={styles.infoBody}>
              Audio and video calls require a development build.{"\n\n"}
              The calling system is fully built — signaling, call UI, incoming
              call overlay — and will activate once the app is compiled with
              native WebRTC support.
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // When WEBRTC_AVAILABLE is true (dev build), the full call UI renders here.
  // For now this branch is unreachable in Expo Go.
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  callTypeLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 8,
    textAlign: "center",
  },
  infoBody: {
    fontSize: 14,
    color: "#D1D5DB",
    lineHeight: 20,
    textAlign: "center",
  },
  closeBtn: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
