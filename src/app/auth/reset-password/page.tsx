"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Link from "next/link";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  return null;
}

function getPasswordStrength(pw: string): {
  label: string;
  color: string;
  width: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;

  if (score <= 1) return { label: "Weak", color: "bg-destructive", width: "w-1/4" };
  if (score === 2) return { label: "Fair", color: "bg-orange-400", width: "w-2/4" };
  if (score === 3) return { label: "Good", color: "bg-powder-blue", width: "w-3/4" };
  return { label: "Strong", color: "bg-success", width: "w-full" };
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [noSession, setNoSession] = useState(false);

  const supabase = createClient();
  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  // Check for active session on mount
  // The callback route should have already exchanged the code and created a session
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
        setChecking(false);
      } else {
        // No session — user navigated here directly without a valid recovery link
        setNoSession(true);
        setChecking(false);
      }
    }

    checkSession();
  }, [supabase]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      if (updateError.message.includes("session")) {
        setError("Your session has expired. Please request a new password reset link.");
      } else {
        setError(updateError.message);
      }
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  }

  // Loading state while checking session
  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Verifying...</p>
        </div>
      </div>
    );
  }

  // No session — redirect to forgot password
  if (noSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-bg">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-text-primary mb-2">
            Invalid or Expired Link
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block px-6 py-3 rounded-[12px] bg-powder-blue text-text-primary font-medium"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-medium text-text-primary">Set New Password</h1>
          <p className="text-text-secondary mt-1">Choose a new password for your account</p>
        </div>

        <Card>
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/10 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <p className="text-sm text-text-primary font-medium mb-1">Password updated successfully!</p>
              <p className="text-sm text-text-secondary">
                Taking you to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">Email</label>
                <p className="text-sm text-text-primary px-4 py-3 rounded-[12px] bg-bg border border-surface-border">
                  {email}
                </p>
              </div>

              <div>
                <Input
                  id="password"
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                {strength && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      strength.label === "Weak" ? "text-destructive" :
                      strength.label === "Fair" ? "text-orange-400" :
                      strength.label === "Good" ? "text-powder-blue" :
                      "text-success"
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <Input
                id="confirm-password"
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />

              {error && (
                <p className="text-sm text-destructive">
                  {error}{" "}
                  {error.includes("request a new") && (
                    <Link href="/auth/forgot-password" className="underline">
                      Request new link
                    </Link>
                  )}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Update Password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
