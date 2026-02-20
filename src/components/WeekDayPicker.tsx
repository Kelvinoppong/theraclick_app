/**
 * WeekDayPicker — horizontal scrollable day selector.
 *
 * Inspired by the reference UI: shows M T W T F S S with
 * dates, highlights the selected day with a filled circle.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

type Props = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekDayPicker({ selectedDate, onSelectDate }: Props) {
  // Generate 14 days starting from today
  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isToday = (d: Date) => {
    const now = new Date();
    return isSameDay(d, now);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day, i) => {
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <TouchableOpacity
            key={i}
            style={[styles.dayItem, selected && styles.dayItemSelected]}
            onPress={() => onSelectDate(day)}
          >
            <Text
              style={[
                styles.dayLabel,
                selected && styles.dayLabelSelected,
              ]}
            >
              {DAY_LABELS[day.getDay()]}
            </Text>
            <Text
              style={[
                styles.dayDate,
                selected && styles.dayDateSelected,
                today && !selected && styles.dayDateToday,
              ]}
            >
              {day.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  dayItem: {
    width: 48,
    height: 70,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  dayItemSelected: {
    backgroundColor: "#16A34A",
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  dayLabelSelected: {
    color: "rgba(255,255,255,0.8)",
  },
  dayDate: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  dayDateSelected: {
    color: "#FFFFFF",
  },
  dayDateToday: {
    color: "#16A34A",
  },
});
