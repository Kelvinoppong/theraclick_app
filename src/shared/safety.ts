/**
 * Client-side crisis detection — mirrors the backend's CRISIS_PATTERNS
 * from app/api/ai/chat/route.ts in the web repo.
 *
 * WHY client-side too? So we can show the Emergency modal *instantly*
 * without waiting for the network round-trip. The backend still runs
 * its own check as a safety net.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bsuicide\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt myself\b/i,
  /\boverdose\b/i,
];

export function looksLikeCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

export const GHANA_EMERGENCY_RESOURCES = [
  {
    name: "Ghana National Ambulance Service",
    number: "112",
    description: "National emergency line",
  },
  {
    name: "Mental Health Authority Helpline",
    number: "0800-123-456",
    description: "Free mental health support",
  },
  {
    name: "Befrienders Ghana",
    number: "+233-24-462-0280",
    description: "Emotional support & crisis intervention",
  },
] as const;
