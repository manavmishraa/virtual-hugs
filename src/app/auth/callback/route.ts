import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // PKCE flow: exchange code for session
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Code exchange error:", error.message);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("Could not authenticate. Please try again.")}`
      );
    }

    // Check if this is a password recovery flow
    // Supabase sets the session user's recovery flag, or we detect from type param
    if (type === "recovery" || data?.session?.user?.recovery_sent_at) {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Implicit/OTP flow fallback: token_hash in URL
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "signup" | "email",
    });

    if (error) {
      console.error("OTP verify error:", error.message);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("This link has expired or is invalid. Please try again.")}`
      );
    }

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code or token_hash — invalid request
  return NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent("Invalid authentication link.")}`
  );
}
