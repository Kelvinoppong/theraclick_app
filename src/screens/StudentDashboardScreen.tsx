/**
 * StudentDashboardScreen — professional counseling-platform home page.
 *
 * Mimics the feel of a real counseling website: hero banner, mission
 * statement, "what to expect" accordion, counselor team, and
 * dynamic content (sessions, messages).
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import type { RootStackParamList } from "../navigation/RootStack";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToDmThreads,
  DirectChat,
} from "../services/messagingStore";
import { subscribeToStudentBookings } from "../services/bookingStore";
import { db, firebaseIsReady } from "../services/firebase";
import type { Booking } from "../shared/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_W } = Dimensions.get("window");

type CounselorPreview = {
  uid: string;
  fullName: string;
  specialization?: string;
};

const EXPECT_ITEMS = [
  {
    title: "Your First Session",
    body: "Your first session is a safe space to share what's on your mind. Your counselor will listen, ask a few questions, and together you'll set goals for your journey. There's no pressure — go at your own pace.",
  },
  {
    title: "Confidentiality",
    body: "Everything discussed in your sessions is strictly confidential. We follow professional ethical guidelines to ensure your privacy. Your real name is never shared unless you choose to.",
  },
  {
    title: "How Booking Works",
    body: "Browse our available counselors, pick a date and time that works for you, and request a session — all completely free. Your counselor will confirm, and you'll receive a notification with details.",
  },
  {
    title: "Community & Peer Support",
    body: "Beyond one-on-one sessions, our community forums connect you with fellow students who understand what you're going through. Share, listen, and grow together in a moderated, safe environment.",
  },
];

export function StudentDashboardScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();

  const [threads, setThreads] = useState<DirectChat[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counselors, setCounselors] = useState<CounselorPreview[]>([]);
  const [mentors, setMentors] = useState<CounselorPreview[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!firebaseIsReady || !db) return;
    (async () => {
      try {
        const cQ = query(
          collection(db!, "users"),
          where("role", "==", "counselor"),
          where("status", "==", "active")
        );
        const cSnap = await getDocs(cQ);
        setCounselors(
          cSnap.docs.slice(0, 6).map((d) => ({
            uid: d.id,
            fullName: d.data().fullName || "Counselor",
            specialization: d.data().specialization,
          }))
        );

        const mQ = query(
          collection(db!, "users"),
          where("role", "==", "peer-mentor"),
          where("status", "==", "active")
        );
        const mSnap = await getDocs(mQ);
        setMentors(
          mSnap.docs.slice(0, 6).map((d) => ({
            uid: d.id,
            fullName: d.data().fullName || "Peer Mentor",
            specialization: d.data().specialization,
          }))
        );
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToDmThreads(profile.uid, setThreads);
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToStudentBookings(profile.uid, setBookings);
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile || !firebaseIsReady || !db) return;
    const uids = threads
      .flatMap((t) => t.participants)
      .filter((uid) => uid !== profile.uid && !names[uid]);
    const unique = [...new Set(uids)];
    if (unique.length === 0) return;
    unique.forEach(async (uid) => {
      try {
        const snap = await getDoc(doc(db!, "users", uid));
        const data = snap.data();
        if (data?.fullName) {
          setNames((prev) => ({ ...prev, [uid]: data.fullName }));
        }
      } catch {}
    });
  }, [threads, profile]);

  const displayName =
    profile?.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : (profile?.fullName?.split(" ")[0] || "Friend");

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );

  const toggleExpand = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Top bar ─── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>Theraklick</Text>
            <Text style={styles.brandSub}>Mental Health Support</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.greetingSmall}>Hi, {displayName}</Text>
          </View>
        </View>

        {/* ─── Hero Banner ─── */}
        <View style={styles.hero}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroLabel}>FOR GHANAIAN STUDENTS</Text>
            <Text style={styles.heroHeadline}>
              Promoting Growth{"\n"}& Healing
            </Text>
            <Text style={styles.heroBody}>
              We provide professional, strength-based counseling and
              peer support services in a caring and supportive
              environment. Completely free.
            </Text>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => nav.navigate("CounselorList")}
            >
              <Text style={styles.heroCtaText}>Schedule a Session</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Mission ─── */}
        <View style={styles.missionSection}>
          <View style={styles.missionDivider} />
          <Text style={styles.missionHeading}>
            Working together for{"\n"}growth and healing
          </Text>
          <View style={styles.missionDivider} />

          <Text style={styles.missionBody}>
            Theraklick provides a team of professional counselors and
            peer mentors dedicated to your well-being. Our services are
            designed to help African students navigate academic stress,
            personal challenges, and mental health concerns.
          </Text>
          <Text style={styles.missionBody}>
            We believe that support should be tailored to your needs
            and unique situation. Listening begins as soon as you reach
            out. If you are not familiar with any of our counselors,
            browse our team and we will gladly assist you in finding the
            right match.
          </Text>
          <Text style={styles.missionHighlight}>
            Seeking help is a big step toward enhancing your quality of
            life. It is an investment in yourself that will produce
            personal growth and skills that will last a lifetime.
          </Text>
        </View>

        {/* ─── Counselor Team ─── */}
        {counselors.length > 0 && (
          <View style={styles.teamSection}>
            <Text style={styles.teamHeading}>Meet the Team</Text>
            <View style={styles.teamDivider} />
            <Text style={styles.teamSubtitle}>
              Our counselors are here to support you through every
              challenge. All sessions are free and confidential.
            </Text>

            <View style={styles.teamGrid}>
              {counselors.map((c) => (
                <TouchableOpacity
                  key={c.uid}
                  style={styles.teamCard}
                  onPress={() => nav.navigate("CounselorList")}
                >
                  <View style={styles.teamAvatar}>
                    <Text style={styles.teamAvatarText}>
                      {c.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {c.fullName}
                  </Text>
                  <Text style={styles.teamRole} numberOfLines={1}>
                    {c.specialization || "Counselor"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.teamCta}
              onPress={() => nav.navigate("CounselorList")}
            >
              <Text style={styles.teamCtaText}>
                View All Counselors
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Peer Mentors ─── */}
        {mentors.length > 0 && (
          <View style={styles.mentorSection}>
            <Text style={styles.teamHeading}>Peer Mentors</Text>
            <View style={styles.teamDivider} />
            <Text style={styles.teamSubtitle}>
              Fellow students trained to listen, support, and guide you.
              No appointment needed — just start a conversation.
            </Text>

            <View style={styles.teamGrid}>
              {mentors.map((m) => (
                <TouchableOpacity
                  key={m.uid}
                  style={styles.mentorCard}
                  onPress={() => nav.navigate("PeerMentorList")}
                >
                  <View style={styles.mentorAvatar}>
                    <Text style={styles.teamAvatarText}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {m.fullName}
                  </Text>
                  <Text style={styles.teamRole} numberOfLines={1}>
                    {m.specialization || "Peer Support"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.mentorCta}
              onPress={() => nav.navigate("PeerMentorList")}
            >
              <Text style={styles.mentorCtaText}>
                View All Peer Mentors
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── What to Expect ─── */}
        <View style={styles.expectSection}>
          <View style={styles.expectDivider} />
          <Text style={styles.expectHeading}>What to expect</Text>
          <Text style={styles.expectIntro}>
            When you reach out to Theraklick, our team makes every effort
            to respond promptly. Here's what you can look forward to:
          </Text>

          {EXPECT_ITEMS.map((item, idx) => {
            const isOpen = expandedIdx === idx;
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.expectItem}
                onPress={() => toggleExpand(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.expectItemHeader}>
                  <Text style={styles.expectItemTitle}>{item.title}</Text>
                  <Text style={styles.expectItemIcon}>
                    {isOpen ? "−" : "+"}
                  </Text>
                </View>
                {isOpen && (
                  <Text style={styles.expectItemBody}>{item.body}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Upcoming Sessions ─── */}
        {upcomingBookings.length > 0 && (
          <View style={styles.dynamicSection}>
            <Text style={styles.dynamicHeading}>Your Upcoming Sessions</Text>
            {upcomingBookings.slice(0, 3).map((b) => {
              const isConfirmed = b.status === "confirmed";
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.sessionRow}
                  onPress={() => {
                    if (isConfirmed && b.dmThreadId) {
                      nav.navigate("DirectMessage", {
                        chatId: b.dmThreadId,
                        otherName: b.counselorName || "Counselor",
                      });
                    }
                  }}
                >
                  <View style={styles.sessionAvatar}>
                    <Text style={styles.sessionAvatarLetter}>
                      {(b.counselorName || "C").charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>
                      {b.counselorName || "Counselor"}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {b.date} at {b.time}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sessionBadge,
                      { backgroundColor: isConfirmed ? "#16A34A" : "#D97706" },
                    ]}
                  >
                    <Text style={styles.sessionBadgeText}>
                      {isConfirmed ? "Confirmed" : "Pending"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Messages ─── */}
        {threads.length > 0 && (
          <View style={styles.dynamicSection}>
            <Text style={styles.dynamicHeading}>Recent Messages</Text>
            {threads.slice(0, 3).map((t) => {
              const otherUid =
                t.participants.find((p) => p !== profile?.uid) || "";
              const otherName = names[otherUid] || "Counselor";
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.sessionRow}
                  onPress={() =>
                    nav.navigate("DirectMessage", {
                      chatId: t.id,
                      otherName,
                    })
                  }
                >
                  <View style={styles.sessionAvatar}>
                    <Text style={styles.sessionAvatarLetter}>
                      {otherName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>{otherName}</Text>
                    <Text style={styles.sessionDate} numberOfLines={1}>
                      {t.lastMessage || "No messages yet"}
                    </Text>
                  </View>
                  <Text style={styles.rowArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── CTA Banner ─── */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaBannerText}>
            Not ready to find support?{"\n"}That's okay.
          </Text>
          <Text style={styles.ctaBannerBody}>
            You can explore at your own pace. Browse our community,
            read about our approach, or simply know that help is here
            when you need it. No pressure, no judgment.
          </Text>
        </View>

        {/* ─── Emergency ─── */}
        <TouchableOpacity
          style={styles.emergencyRow}
          onPress={() => nav.navigate("Emergency")}
        >
          <View style={styles.emergencyDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Crisis Support</Text>
            <Text style={styles.emergencyBody}>
              If you or someone you know is in immediate danger,
              tap here for urgent resources.
            </Text>
          </View>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Theraklick</Text>
          <Text style={styles.footerText}>
            Mental health support for African students.{"\n"}
            All services are free and confidential.
          </Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerCopy}>
            © {new Date().getFullYear()} Theraklick. Your privacy matters.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAF8" },
  scroll: { paddingBottom: 30 },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: "#FAFAF8",
  },
  brand: {
    fontSize: 20,
    fontWeight: "900",
    color: "#16A34A",
    letterSpacing: -0.5,
  },
  brandSub: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  topRight: { alignItems: "flex-end" },
  greetingSmall: { fontSize: 13, color: "#374151", fontWeight: "600" },

  /* Hero */
  hero: {
    marginHorizontal: 0,
    backgroundColor: "#16A34A",
    minHeight: 240,
    justifyContent: "flex-end",
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 24,
    paddingTop: 40,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    opacity: 0.85,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 34,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 14,
    color: "#E5E7EB",
    lineHeight: 21,
    marginBottom: 18,
  },
  heroCta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  heroCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Mission */
  missionSection: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  missionDivider: {
    height: 2,
    backgroundColor: "#16A34A",
    width: 60,
    marginBottom: 16,
  },
  missionHeading: {
    fontSize: 24,
    fontWeight: "300",
    color: "#16A34A",
    lineHeight: 32,
    marginBottom: 20,
    fontStyle: "italic",
  },
  missionBody: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 14,
  },
  missionHighlight: {
    fontSize: 14,
    color: "#16A34A",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 10,
  },

  /* Team */
  teamSection: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 24,
    backgroundColor: "#F9FAFB",
  },
  teamHeading: {
    fontSize: 22,
    fontWeight: "300",
    color: "#16A34A",
    fontStyle: "italic",
    marginBottom: 6,
  },
  teamDivider: {
    height: 2,
    backgroundColor: "#16A34A",
    width: 60,
    marginBottom: 12,
  },
  teamSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 20,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  teamCard: {
    width: (SCREEN_W - 58) / 2,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  teamAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#16A34A",
  },
  teamAvatarText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  teamName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  teamRole: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  teamCta: {
    borderWidth: 2,
    borderColor: "#16A34A",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  teamCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Peer Mentors */
  mentorSection: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 24,
    backgroundColor: "#EFF6FF",
  },
  mentorCard: {
    width: (SCREEN_W - 58) / 2,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  mentorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#2563EB",
  },
  mentorCta: {
    borderWidth: 2,
    borderColor: "#2563EB",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  mentorCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* What to Expect */
  expectSection: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  expectDivider: {
    height: 2,
    backgroundColor: "#16A34A",
    width: 60,
    marginBottom: 16,
  },
  expectHeading: {
    fontSize: 24,
    fontWeight: "300",
    color: "#16A34A",
    fontStyle: "italic",
    marginBottom: 12,
  },
  expectIntro: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 20,
  },
  expectItem: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 16,
  },
  expectItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expectItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#16A34A",
    flex: 1,
  },
  expectItemIcon: {
    fontSize: 22,
    color: "#16A34A",
    fontWeight: "300",
    width: 28,
    textAlign: "center",
  },
  expectItemBody: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginTop: 10,
  },

  /* Dynamic sections (sessions, messages) */
  dynamicSection: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 6,
    backgroundColor: "#F9FAFB",
  },
  dynamicHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sessionAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sessionAvatarLetter: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  sessionDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  sessionBadge: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rowArrow: {
    fontSize: 22,
    color: "#D1D5DB",
    fontWeight: "300",
  },

  /* CTA Banner */
  ctaBanner: {
    marginHorizontal: 22,
    marginTop: 28,
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 24,
  },
  ctaBannerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 26,
    marginBottom: 10,
  },
  ctaBannerBody: {
    fontSize: 13,
    color: "#D1D5DB",
    lineHeight: 20,
  },

  /* Emergency */
  emergencyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    gap: 12,
  },
  emergencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },
  emergencyTitle: { fontSize: 14, fontWeight: "700", color: "#991B1B" },
  emergencyBody: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 17,
    marginTop: 2,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 10,
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16A34A",
    marginBottom: 6,
  },
  footerText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    width: 80,
    marginVertical: 14,
  },
  footerCopy: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
