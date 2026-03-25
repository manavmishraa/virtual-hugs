import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { DEFAULT_PREFERENCES } from "@/lib/types";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { email: invitedEmail } = await request.json();

  if (!invitedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (invitedEmail.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  // Get sender's preferences via RPC
  const { data: senderProfile } = await supabase.rpc("get_my_profile");
  const senderPrefs = senderProfile?.preferences
    ? { ...DEFAULT_PREFERENCES, ...senderProfile.preferences }
    : DEFAULT_PREFERENCES;
  const defaultHugType = senderPrefs.default_hug_type || "warm";

  // Create invite + auto-hug via SECURITY DEFINER RPC
  const { data: result, error: rpcError } = await supabase.rpc("create_invite", {
    p_invited_email: invitedEmail,
    p_hug_type: defaultHugType,
    p_sender_preferences: senderPrefs,
  });

  if (rpcError) {
    console.error("Invite RPC error:", JSON.stringify(rpcError));
    return NextResponse.json(
      { error: rpcError.message || "Failed to create invite." },
      { status: 500 }
    );
  }

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const senderName = result?.sender_name || "Someone";

  // Send an invite email to the invited person
  try {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await adminSupabase.auth.signInWithOtp({
      email: invitedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
  } catch (e) {
    console.error("Email send error:", e);
    // Don't fail the invite if email fails
  }

  return NextResponse.json({
    success: true,
    message: `${senderName} invited ${invitedEmail} to Virtual Hugs!`,
  });
}
