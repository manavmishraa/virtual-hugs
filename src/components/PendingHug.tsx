"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { HUG_CONFIG, type Hug } from "@/lib/types";

interface PendingHugProps {
  hug: Hug;
  onAccepted: () => void;
}

export default function PendingHug({ hug, onAccepted }: PendingHugProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const config = HUG_CONFIG[hug.hug_type];
  const senderName = hug.sender?.display_name || "Someone";

  async function handleAccept() {
    router.push(`/hug?id=${hug.id}`);
  }

  async function handleSaveForLater() {
    setSaving(true);
    // Just dismiss from view, hug stays as "sent" status
    onAccepted();
    setSaving(false);
  }

  // Notification text per type
  const notifText =
    hug.hug_type === "nudge"
      ? `${senderName} nudged you`
      : `${senderName} sent you a ${config.label.toLowerCase()}`;

  return (
    <Card
      className="relative overflow-hidden"
    >
      {/* Warm gradient accent */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
        }}
      />
      <div className="relative">
        <p className="text-base font-medium text-text-primary mb-1">{notifText}</p>
        <p className="text-sm text-text-secondary mb-4">
          {hug.hug_type === "nudge"
            ? "Tap to feel it."
            : `A ${hug.hug_type} hug is waiting for you. Tap when you're ready.`}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleAccept} className="flex-1">
            Accept Hug
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveForLater}
            loading={saving}
            className="flex-1"
          >
            Save for Later
          </Button>
        </div>
      </div>
    </Card>
  );
}
