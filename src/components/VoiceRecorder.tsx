/**
 * VoiceRecorder — record audio clips for the community.
 *
 * Shows a mic button that toggles recording.
 * After recording, shows a playback preview with duration + send/cancel.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Audio } from "expo-av";

type Props = {
  onRecordingComplete: (uri: string, durationMs: number) => void;
  onCancel: () => void;
};

export function VoiceRecorder({ onRecordingComplete, onCancel }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setDurationMs(0);

      const start = Date.now();
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - start);
      }, 100);
    } catch (err) {
      console.warn("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        onRecordingComplete(uri, durationMs);
      }
    } catch (err) {
      console.warn("Failed to stop recording:", err);
    }
  };

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.recordRow}>
        {/* Cancel */}
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {/* Timer */}
        <View style={styles.timerWrap}>
          {isRecording && <View style={styles.redDot} />}
          <Text style={styles.timerText}>{formatDuration(durationMs)}</Text>
        </View>

        {/* Record / Stop button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnRecording]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.micIcon}>{isRecording ? "⏹" : "🎙"}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text style={styles.hint}>
        {isRecording ? "Tap stop when done" : "Tap the mic to start recording"}
      </Text>
    </View>
  );
}

/**
 * VoicePlayer — play back a recorded voice note.
 */
export function VoicePlayer({ uri, durationMs }: { uri: string; durationMs: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound>();

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    try {
      if (playing && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playFromPositionAsync(0);
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              if (status.durationMillis) {
                setProgress(status.positionMillis / status.durationMillis);
              }
              if (status.didJustFinish) {
                setPlaying(false);
                setProgress(0);
              }
            }
          }
        );
        soundRef.current = sound;
      }
      setPlaying(true);
    } catch (err) {
      console.warn("Playback error:", err);
    }
  };

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  return (
    <TouchableOpacity style={playerStyles.container} onPress={togglePlay}>
      <Text style={playerStyles.icon}>{playing ? "⏸" : "▶️"}</Text>
      <View style={playerStyles.barWrap}>
        <View style={[playerStyles.barFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
      </View>
      <Text style={playerStyles.duration}>{formatDuration(durationMs)}</Text>
    </TouchableOpacity>
  );
}

const playerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 6,
  },
  icon: { fontSize: 16 },
  barWrap: {
    flex: 1,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    backgroundColor: "#16A34A",
    borderRadius: 2,
  },
  duration: { fontSize: 11, fontWeight: "600", color: "#6B7280", minWidth: 32 },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  timerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  timerText: { fontSize: 22, fontWeight: "700", color: "#111827", fontVariant: ["tabular-nums"] },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  micBtnRecording: {
    backgroundColor: "#FEE2E2",
  },
  micIcon: { fontSize: 24 },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
});
