"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HugExperience from "@/components/HugExperience";
import { DEFAULT_PREFERENCES, type Hug, type HugType, type UserPreferences } from "@/lib/types";

function HugPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const hugId = searchParams.get("id");
  const [hug, setHug] = useState<Hug | null>(null);
  const [senderName, setSenderName] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const loadHug = useCallback(async () => {
    if (!hugId) return;

    // Use RPC to get hug with sender info (bypasses table permissions)
    const { data, error } = await supabase.rpc("get_hug_with_sender", {
      p_hug_id: hugId,
    });

    if (error) {
      console.error("Failed to load hug:", error);
      router.push("/dashboard");
      return;
    }

    if (data) {
      setHug(data);
      setSenderName(data.sender?.display_name || "Someone");

      // Use the SENDER's preferences stored with the hug
      if (data.sender_preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.sender_preferences });
      }
    } else {
      router.push("/dashboard");
    }
  }, [hugId, supabase, router]);

  useEffect(() => {
    loadHug();
  }, [loadHug]);

  async function handleComplete() {
    if (!hug) return;
    // Mark hug as received via RPC
    await supabase.rpc("mark_hug_received", { p_hug_id: hug.id });
    router.push("/dashboard");
  }

  if (!hug) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading hug...</p>
        </div>
      </div>
    );
  }

  return (
    <HugExperience
      hugType={hug.hug_type as HugType}
      senderName={senderName}
      onComplete={handleComplete}
      preferences={preferences}
    />
  );
}

export default function HugPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <HugPageContent />
    </Suspense>
  );
}
