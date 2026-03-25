"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Button from "@/components/Button";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  // Countdown timer for resend throttle
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("rate")) {
        setMessage("Please wait before requesting another email.");
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage("Verification email resent!");
      setResendCooldown(60);
    }
    setResending(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-success/10 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13L2 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Check Your Email</h1>
          <p className="text-text-secondary mt-2">
            We sent a confirmation link to
          </p>
          {email && (
            <p className="text-text-primary font-medium mt-1">{email}</p>
          )}
        </div>

        <Card>
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-text-secondary">
              Click the link in the email to verify your account. If you don&apos;t see it, check your spam folder.
            </p>

            <Button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              loading={resending}
              variant="secondary"
              className="w-full"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend Email"}
            </Button>

            {message && (
              <p className={`text-sm ${message.includes("resent") ? "text-success" : "text-destructive"}`}>
                {message}
              </p>
            )}

            <Link
              href="/auth/signup"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Use a different email
            </Link>

            <div className="border-t border-surface-border pt-3">
              <Link
                href="/auth/login"
                className="text-sm text-powder-blue-hover underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-bg">
          <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
