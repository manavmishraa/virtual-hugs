"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import {
  HUG_CONFIG,
  DEFAULT_PREFERENCES,
  type User,
  type HugType,
  type UserPreferences,
} from "@/lib/types";

const DURATION_OPTIONS = [
  { value: 0.5, label: "Half (15s / 5s)" },
  { value: 1, label: "Normal (30s / 10s)" },
  { value: 1.5, label: "Extended (45s / 15s)" },
  { value: 2, label: "Double (60s / 20s)" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const loadSettings = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      router.push("/auth/login");
      return;
    }

    // Use RPC function to bypass table-level permission issues
    const { data: profile } = await supabase.rpc("get_my_profile");

    if (profile) {
      setUser(profile);
      setDisplayName(profile.display_name);
      const prefs = profile.preferences
        ? { ...DEFAULT_PREFERENCES, ...profile.preferences }
        : DEFAULT_PREFERENCES;
      setPreferences(prefs);
      setSavedPreferences(prefs);
    } else {
      // Fallback to auth metadata
      setUser({
        id: authUser.id,
        email: authUser.email!,
        display_name: authUser.user_metadata?.display_name || authUser.email!.split("@")[0],
        paired_with: null,
        created_at: new Date().toISOString(),
      });
      setDisplayName(authUser.user_metadata?.display_name || authUser.email!.split("@")[0]);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Track changes
  useEffect(() => {
    if (!user) return;
    const changed =
      displayName !== user.display_name ||
      JSON.stringify(preferences) !== JSON.stringify(savedPreferences);
    setHasChanges(changed);
    if (changed && saveState === "saved") {
      setSaveState("idle");
    }
  }, [displayName, preferences, user, savedPreferences, saveState]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveState("idle");
    setErrorMessage("");

    // Use RPC function to bypass table-level permission issues
    const { data: updated, error } = await supabase.rpc("update_my_profile", {
      p_display_name: displayName,
      p_preferences: preferences,
    });

    if (error) {
      console.error("Save settings error:", JSON.stringify(error));
      setSaveState("error");
      setErrorMessage("Failed to save settings. Try again.");
    } else {
      setSaveState("saved");
      setSavedPreferences(preferences);
      setUser(updated || { ...user, display_name: displayName, preferences });
      setHasChanges(false);
    }
    setSaving(false);
  }

  function updatePref<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Loading...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const selectedConfig = HUG_CONFIG[preferences.default_hug_type];
  const durationLabel = DURATION_OPTIONS.find(
    (o) => o.value === preferences.hug_duration_multiplier
  )?.label;

  return (
    <AppShell>
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <h1 className="text-xl font-medium text-text-primary">Settings</h1>

        {/* Save Success Banner */}
        {saveState === "saved" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-success/10 border border-success/30">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Settings saved!</p>
              <p className="text-xs text-text-secondary">Your hug preferences have been updated.</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {saveState === "error" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-destructive/10 border border-destructive/30">
            <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Profile */}
        <Card>
          <h2 className="text-base font-medium text-text-primary mb-4">Profile</h2>
          <div className="flex flex-col gap-4">
            <Input
              id="display-name"
              label="Display Name"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Email</label>
              <p className="text-sm text-text-primary px-4 py-3 rounded-[12px] bg-bg border border-surface-border">
                {user?.email}
              </p>
            </div>
          </div>
        </Card>

        {/* Default Hug Type */}
        <Card>
          <h2 className="text-base font-medium text-text-primary mb-2">Default Hug Type</h2>
          <p className="text-sm text-text-secondary mb-4">
            This will be pre-selected when you send a hug.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(HUG_CONFIG) as [HugType, (typeof HUG_CONFIG)[HugType]][]).map(
              ([type, config]) => {
                const isSelected = preferences.default_hug_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updatePref("default_hug_type", type)}
                    className={`
                      flex flex-col items-center gap-2 p-4
                      rounded-[14px] border bg-surface
                      transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? "border-powder-blue ring-2 ring-powder-blue/30 bg-powder-blue-10"
                          : "border-surface-border hover:border-powder-blue"
                      }
                    `}
                  >
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                      }}
                    />
                    <span className="text-xs font-medium text-text-primary">{config.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </Card>

        {/* Experience Settings */}
        <Card>
          <h2 className="text-base font-medium text-text-primary mb-4">Hug Experience</h2>
          <div className="flex flex-col gap-5">
            {/* Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-secondary font-medium">
                Experience Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = preferences.hug_duration_multiplier === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updatePref("hug_duration_multiplier", opt.value)}
                      className={`
                        px-3 py-2.5 rounded-[10px] text-sm font-medium
                        border transition-all duration-200 cursor-pointer
                        ${
                          isSelected
                            ? "border-powder-blue bg-powder-blue text-text-primary"
                            : "border-surface-border bg-surface text-text-secondary hover:border-powder-blue"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sound toggle */}
            <ToggleRow
              label="Sound"
              description="Heartbeat, ambient pad, and exit chime during the hug experience"
              checked={preferences.sound_enabled}
              onChange={(v) => updatePref("sound_enabled", v)}
            />

            {/* Haptics toggle */}
            <ToggleRow
              label="Haptics"
              description="Vibration pulses synced to the heartbeat (on supported devices)"
              checked={preferences.haptics_enabled}
              onChange={(v) => updatePref("haptics_enabled", v)}
            />

            {/* Notification sound toggle */}
            <ToggleRow
              label="Notification Sound"
              description="Play a sound when you receive a new hug"
              checked={preferences.notification_sound}
              onChange={(v) => updatePref("notification_sound", v)}
            />
          </div>
        </Card>

        {/* Hug Preview Card */}
        <Card className="overflow-hidden">
          <h2 className="text-base font-medium text-text-primary mb-2">Your Hug Preview</h2>
          <p className="text-xs text-text-secondary mb-4">
            This is how your default hug will look when sent to your partner.
          </p>
          <div
            className="relative rounded-[14px] overflow-hidden p-6"
            style={{
              background: `linear-gradient(135deg, ${selectedConfig.gradient[0]}, ${selectedConfig.gradient[1]})`,
            }}
          >
            {/* Glow dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full animate-pulse"
                  style={{
                    width: `${6 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 8}px`,
                    backgroundColor: selectedConfig.glow,
                    opacity: 0.4 + Math.random() * 0.3,
                    top: `${10 + Math.random() * 80}%`,
                    left: `${5 + Math.random() * 90}%`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative text-center">
              <p className="text-white/60 text-xs font-medium tracking-wider mb-2">
                From {displayName || "You"}
              </p>
              <p className="text-white text-lg font-medium mb-1">
                {selectedConfig.label}
              </p>
              <p className="text-white/70 text-xs mb-4">
                {selectedConfig.description}
              </p>

              {/* Preview info pills */}
              <div className="flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white/80 text-xs">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  {durationLabel}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white/80 text-xs">
                  {preferences.sound_enabled ? (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  )}
                  {preferences.sound_enabled ? "Sound on" : "Sound off"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white/80 text-xs">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {preferences.haptics_enabled ? "Haptics on" : "Haptics off"}
                </span>
              </div>
            </div>

            {/* Subtle heartbeat pulse */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full animate-pulse pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${selectedConfig.glow}44 0%, transparent 70%)`,
                animationDuration: `${60 / selectedConfig.bpm}s`,
              }}
            />
          </div>
        </Card>

        {/* Save Button */}
        <Button type="submit" loading={saving} disabled={!hasChanges && saveState !== "idle"}>
          {saving ? "Saving..." : saveState === "saved" && !hasChanges ? "Saved" : "Save Settings"}
        </Button>
      </form>
    </AppShell>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer
          ${checked ? "bg-powder-blue" : "bg-surface-border"}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200
            ${checked ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}
