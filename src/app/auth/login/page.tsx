"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  // Show error from URL params (e.g., from callback redirect)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(urlError);
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/dashboard");
    });
  }, [supabase, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // User-friendly error messages per PRD
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password.");
      } else if (error.message.includes("Email not confirmed")) {
        setError(
          "Please verify your email before signing in."
        );
      } else if (error.message.includes("rate")) {
        setError("Too many sign-in attempts. Please try again in a few minutes.");
      } else {
        setError(error.message);
      }
    } else {
      window.location.href = "/dashboard";
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-powder-blue mx-auto mb-4 flex items-center justify-center">
            <HugIcon className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Virtual Hugs</h1>
          <p className="text-text-secondary mt-1">Welcome back</p>
        </div>

        <Card>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right mt-1.5">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-powder-blue-hover underline">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-bg">
          <div className="w-8 h-8 border-2 border-powder-blue border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function HugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 4 16.5 4 10.5C4 7.42 6.42 5 9.5 5C11.24 5 12 6 12 6C12 6 12.76 5 14.5 5C17.58 5 20 7.42 20 10.5C20 16.5 12 21 12 21Z" />
    </svg>
  );
}
