"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

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

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side password validation
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already_exists")) {
        setError("An account with this email already exists. Sign in instead?");
      } else if (signUpError.message.includes("rate")) {
        setError("Too many attempts. Please try again in a few minutes.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // If auto-confirmed (email confirmations disabled), go to dashboard
    if (data.user && data.session) {
      window.location.href = "/dashboard";
      return;
    }

    // Email confirmation required — redirect to verify screen
    if (data.user && !data.session) {
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-powder-blue mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21C12 21 4 16.5 4 10.5C4 7.42 6.42 5 9.5 5C11.24 5 12 6 12 6C12 6 12.76 5 14.5 5C17.58 5 20 7.42 20 10.5C20 16.5 12 21 12 21Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Join Virtual Hugs</h1>
          <p className="text-text-secondary mt-1">Create your account</p>
        </div>

        <Card>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input
              id="name"
              label="Display Name"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {/* Password strength indicator */}
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

            {error && (
              <p className="text-sm text-destructive">
                {error}{" "}
                {error.includes("already exists") && (
                  <Link href="/auth/login" className="underline">
                    Sign in
                  </Link>
                )}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Create Account
            </Button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-4">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-powder-blue-hover underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
