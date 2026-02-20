/**
 * SplashScreen — animated brand intro shown while auth loads.
 *
 * Features:
 *   - Gradient background
 *   - Floating animated orbs (calming, therapy-like)
 *   - Logo fade + scale entrance
 *   - Tagline typewriter effect
 *   - Smooth fade-out transition to app
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

// Floating orb component
function FloatingOrb({
  size,
  color,
  startX,
  startY,
  delay,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Gentle floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -30,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 30,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 20,
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -20,
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
      }}
    />
  );
}

export function SplashScreen({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const [taglineText, setTaglineText] = useState("");
  const fullTagline = "Support in your pocket, instantly.";

  useEffect(() => {
    // 1. Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Logo pulse
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1200);

    // 3. Tagline typewriter
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();

      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTaglineText(fullTagline.slice(0, i));
        if (i >= fullTagline.length) clearInterval(interval);
      }, 40);
    }, 1200);

    // 4. Subtitle
    setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 3000);

    // 5. Fade out and finish
    setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 4200);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Background gradient layers */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Floating orbs */}
      <FloatingOrb size={200} color="#86EFAC" startX={-40} startY={height * 0.1} delay={200} />
      <FloatingOrb size={160} color="#34D399" startX={width * 0.6} startY={height * 0.15} delay={500} />
      <FloatingOrb size={120} color="#6EE7B7" startX={width * 0.2} startY={height * 0.6} delay={800} />
      <FloatingOrb size={180} color="#A7F3D0" startX={width * 0.5} startY={height * 0.7} delay={300} />
      <FloatingOrb size={100} color="#D1FAE5" startX={width * 0.1} startY={height * 0.4} delay={600} />
      <FloatingOrb size={140} color="#34D399" startX={width * 0.7} startY={height * 0.45} delay={400} />

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo icon */}
        <Animated.View
          style={[
            styles.logoCircle,
            {
              opacity: logoOpacity,
              transform: [{ scale: Animated.multiply(logoScale, pulseScale) }],
            },
          ]}
        >
          <Text style={styles.logoIcon}>🧠</Text>
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[
            styles.brandName,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          Theraklick
        </Animated.Text>

        {/* Tagline (typewriter) */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={styles.tagline}>{taglineText}</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Mental health support for students in Africa
        </Animated.Text>
      </View>

      {/* Bottom loading bar */}
      <View style={styles.bottomBar}>
        <LoadingBar />
      </View>
    </Animated.View>
  );
}

function LoadingBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 3800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.loadingTrack}>
      <Animated.View style={[styles.loadingFill, { width: barWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#064E3B",
  },
  bgBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: "#065F46",
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    opacity: 0.3,
  },
  center: {
    alignItems: "center",
    zIndex: 10,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoIcon: {
    fontSize: 44,
  },
  brandName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 17,
    fontWeight: "600",
    color: "#A7F3D0",
    textAlign: "center",
    minHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(167, 243, 208, 0.7)",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 60,
    left: 40,
    right: 40,
    zIndex: 10,
  },
  loadingTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    backgroundColor: "#34D399",
    borderRadius: 2,
  },
});
