export type HugType = "warm" | "tight" | "nudge";

export type HugStatus = "sent" | "received" | "expired";

export type PairingStatus = "pending" | "active" | "dissolved";

export interface UserPreferences {
  default_hug_type: HugType;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  hug_duration_multiplier: number; // 0.5x, 1x, 1.5x, 2x
  notification_sound: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  default_hug_type: "warm",
  sound_enabled: true,
  haptics_enabled: true,
  hug_duration_multiplier: 1,
  notification_sound: true,
};

export interface User {
  id: string;
  email: string;
  display_name: string;
  paired_with: string | null;
  created_at: string;
  preferences?: UserPreferences;
}

export interface Pairing {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  status: PairingStatus;
  invited_email: string;
  created_at: string;
}

export interface Hug {
  id: string;
  pairing_id: string;
  sender_id: string;
  hug_type: HugType;
  status: HugStatus;
  sent_at: string;
  received_at: string | null;
  sender?: User;
  sender_preferences?: UserPreferences;
}

export const HUG_CONFIG = {
  warm: {
    label: "Warm Hug",
    emoji: "warm",
    description: "Comfort, safety, love",
    duration: 30000,
    bpm: 60,
    gradient: ["#F5C882", "#E8A94E"],
    glow: "#FFF5E6",
    sound: "Slow heartbeat, soft ambient pad",
  },
  tight: {
    label: "Tight Hug",
    emoji: "tight",
    description: "Reassurance, intensity, 'I'm here'",
    duration: 30000,
    bpm: 72,
    gradient: ["#D4836A", "#B85C43"],
    glow: "#FFE0D4",
    sound: "Deeper heartbeat, bass tones",
  },
  nudge: {
    label: "Gentle Nudge",
    emoji: "nudge",
    description: "Playful, light, 'thinking of you'",
    duration: 10000,
    bpm: 80,
    gradient: ["#B0E0E6", "#E6F5F8"],
    glow: "#FFFFFF",
    sound: "Soft tap, brief melody",
  },
} as const;
