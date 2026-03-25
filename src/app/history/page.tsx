"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { HUG_CONFIG, type Hug } from "@/lib/types";

export default function HistoryPage() {
  const supabase = createClient();
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get active pairing
    const { data: pairings } = await supabase
      .from("pairings")
      .select("id")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq("status", "active")
      .limit(1);

    if (!pairings || pairings.length === 0) return;

    const { data } = await supabase
      .from("hugs")
      .select("*, sender:users!hugs_sender_id_fkey(*)")
      .eq("pairing_id", pairings[0].id)
      .order("sent_at", { ascending: false })
      .limit(50);

    setHugs(data || []);
  }, [supabase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium text-text-primary">Hug History</h1>

        {hugs.length === 0 ? (
          <Card>
            <p className="text-text-secondary text-center py-4">
              No hugs yet. Send one to get started!
            </p>
          </Card>
        ) : (
          hugs.map((hug) => {
            const config = HUG_CONFIG[hug.hug_type];
            const isSent = hug.sender_id === userId;
            return (
              <Card key={hug.id} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {isSent ? "You sent" : "You received"} a {config.label.toLowerCase()}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatTime(hug.sent_at)}
                    {hug.status === "received" && " · Accepted"}
                    {hug.status === "sent" && " · Pending"}
                    {hug.status === "expired" && " · Expired"}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
