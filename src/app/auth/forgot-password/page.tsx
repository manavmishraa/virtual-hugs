"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      if (error.message.includes("rate")) {
        setError("Too many attempts. Please try again in a few minutes.");
      } else {
        // Per PRD: never reveal if email exists or not
        // But if it's a real error (network, etc.), show it
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // Per PRD: always show the same message regardless of whether email exists
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/rohee.jpeg"
            alt="Virtual Hugs"
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg"
          />
          <h1 className="text-2xl font-medium text-text-primary">Forgot Password</h1>
          <p className="text-text-secondary mt-1">
            {sent ? "Check your email" : "We'll send you a reset link"}
          </p>
        </div>

        <Card>
          {sent ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <p className="text-sm text-text-primary font-medium">
                If an account exists with {email}, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-sm text-text-secondary">
                Check your spam folder if you don&apos;t see it.
              </p>
              <div className="border-t border-surface-border pt-3 mt-1">
                <Link
                  href="/auth/login"
                  className="text-sm text-powder-blue-hover underline"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-text-secondary">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>

              <Link
                href="/auth/login"
                className="text-sm text-text-secondary hover:text-text-primary text-center transition-colors"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
