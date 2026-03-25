"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import HugTypeSelector from "@/components/HugTypeSelector";
import PendingHug from "@/components/PendingHug";
import type { User, Pairing, Hug, HugType, UserPreferences } from "@/lib/types";
import { DEFAULT_PREFERENCES } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activePairing, setActivePairing] = useState<Pairing | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Pairing[]>([]);
  const [partner, setPartner] = useState<User | null>(null);
  const [pendingHugs, setPendingHugs] = useState<Hug[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [showDissolveConfirm, setShowDissolveConfirm] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push("/auth/login");
      return;
    }

    // Get profile via RPC
    const { data: profile } = await supabase.rpc("get_my_profile");
    setUser(profile || {
      id: authUser.id,
      email: authUser.email!,
      display_name: authUser.user_metadata?.display_name || authUser.email!.split("@")[0],
      paired_with: null,
      created_at: new Date().toISOString(),
    });

    // Get all pairings (active + pending) via RPC
    const { data: pairings } = await supabase.rpc("get_my_pairings");
    const allPairings: Pairing[] = pairings || [];

    // Separate active vs pending
    const active = allPairings.find((p: Pairing) => p.status === "active");
    const pending = allPairings.filter(
      (p: Pairing) => p.status === "pending" && p.sender_id === authUser.id
    );

    setActivePairing(active || null);
    setPendingInvites(pending);

    if (active) {
      const partnerId = active.sender_id === authUser.id ? active.recipient_id : active.sender_id;
      if (partnerId) {
        const { data: partnerData } = await supabase.rpc("get_partner_profile", {
          p_partner_id: partnerId,
        });
        setPartner(partnerData);
      }

      // Load pending hugs via RPC
      const { data: hugs } = await supabase.rpc("get_my_pending_hugs");
      setPendingHugs(hugs || []);
    } else {
      setPartner(null);
      setPendingHugs([]);

      // Check for pending invite to accept (if this user was invited)
      if (pending.length === 0) {
        const { data: acceptResult } = await supabase.rpc("accept_pending_invite");
        if (acceptResult?.found) {
          loadData();
          return;
        }
      }
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for incoming hugs
  useEffect(() => {
    if (!activePairing || !user) return;

    const channel = supabase
      .channel("hugs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hugs",
          filter: `pairing_id=eq.${activePairing.id}`,
        },
        () => loadData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activePairing, user, supabase, loadData]);

  // Realtime subscription for pairing status changes (invite accepted)
  useEffect(() => {
    if (pendingInvites.length === 0) return;

    const channel = supabase
      .channel("pairings-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pairings",
        },
        () => loadData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pendingInvites, supabase, loadData]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setInviting(true);
    setMessage("");

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error || "Failed to create invite.");
      } else {
        setMessageType("success");
        setMessage(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail("");
        loadData();
      }
    } catch {
      setMessageType("error");
      setMessage("Failed to create invite.");
    }
    setInviting(false);
  }

  async function handleSendHug(type: HugType) {
    if (!activePairing || !user) return;
    setSending(true);

    const senderPrefs = user.preferences || DEFAULT_PREFERENCES;

    const { error } = await supabase.rpc("send_hug", {
      p_pairing_id: activePairing.id,
      p_hug_type: type,
      p_sender_preferences: senderPrefs,
    });

    if (error) {
      setMessageType("error");
      setMessage("Failed to send hug. Try again.");
    } else {
      setMessageType("success");
      setMessage(`${type === "nudge" ? "Gentle nudge" : type === "warm" ? "Warm hug" : "Tight hug"} sent!`);
    }
    setSending(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleDissolve() {
    if (!activePairing || !user) return;
    await supabase.rpc("dissolve_pairing", { p_pairing_id: activePairing.id });
    setShowDissolveConfirm(false);
    loadData();
  }

  async function handleCancelInvite(pairingId: string) {
    await supabase.rpc("dissolve_pairing", { p_pairing_id: pairingId });
    loadData();
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

  const hasPairingOrInvite = activePairing || pendingInvites.length > 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        {user && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium text-text-primary">
                Hi, {user.display_name}
              </h1>
              <p className="text-sm text-text-secondary">
                {activePairing
                  ? `Paired with ${partner?.display_name || "..."}`
                  : pendingInvites.length > 0
                  ? "Invite pending..."
                  : "Not paired yet"}
              </p>
            </div>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        )}

        {/* Pending hugs from partner */}
        {pendingHugs.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendingHugs.map((hug) => (
              <PendingHug key={hug.id} hug={hug} onAccepted={loadData} />
            ))}
          </div>
        )}

        {/* Active pairing — send hugs */}
        {activePairing && partner && (
          <>
            <Card>
              <h2 className="text-base font-medium text-text-primary mb-4">
                Send a hug to {partner.display_name}
              </h2>
              <HugTypeSelector
                onSelect={handleSendHug}
                disabled={sending}
                defaultType={user?.preferences?.default_hug_type || DEFAULT_PREFERENCES.default_hug_type}
              />
            </Card>

            {message && (
              <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] ${
                messageType === "success"
                  ? "bg-success/10 border border-success/30"
                  : "bg-destructive/10 border border-destructive/30"
              }`}>
                {messageType === "success" ? (
                  <svg className="w-4 h-4 text-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-destructive flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
                <p className={`text-sm font-medium ${messageType === "success" ? "text-success" : "text-destructive"}`}>
                  {message}
                </p>
              </div>
            )}

            <div className="pt-4">
              {!showDissolveConfirm ? (
                <button
                  onClick={() => setShowDissolveConfirm(true)}
                  className="text-sm text-text-secondary hover:text-destructive transition-colors w-full text-center cursor-pointer"
                >
                  Dissolve pairing
                </button>
              ) : (
                <Card className="border-destructive/30">
                  <p className="text-sm text-text-primary mb-3">
                    Are you sure? This will end your pairing with {partner.display_name}.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDissolve} className="flex-1">
                      Dissolve
                    </Button>
                    <Button variant="secondary" onClick={() => setShowDissolveConfirm(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Pending invites sent by this user */}
        {!activePairing && pendingInvites.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <Card key={invite.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <h3 className="text-sm font-medium text-text-primary">Invite Pending</h3>
                    </div>
                    <p className="text-sm text-text-secondary mb-1">
                      Waiting for <span className="font-medium text-text-primary">{invite.invited_email}</span> to join
                    </p>
                    <p className="text-xs text-text-secondary">
                      Sent {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInviteEmail(invite.invited_email);
                      handleCancelInvite(invite.id);
                    }}
                    className="flex-1 text-sm"
                  >
                    Cancel Invite
                  </Button>
                </div>
              </Card>
            ))}

            {/* Quick resend info */}
            <p className="text-xs text-text-secondary text-center px-4">
              Your partner will see the hug you configured when they sign up and log in.
            </p>
          </div>
        )}

        {/* No pairing and no pending invites — show invite form */}
        {!hasPairingOrInvite && user && (
          <Card>
            <h2 className="text-base font-medium text-text-primary mb-2">
              Invite someone
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Enter their email to create a 1:1 pairing. You&apos;ll be able to exchange hugs once they join.
            </p>
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <Input
                id="invite-email"
                type="email"
                placeholder="partner@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Button type="submit" loading={inviting}>
                Send Invite
              </Button>
            </form>
            {message && (
              <p className={`text-sm mt-3 ${messageType === "success" ? "text-success" : "text-destructive"}`}>
                {message}
              </p>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
