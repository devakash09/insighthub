"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FieldErrors = Partial<Record<"password" | "confirm", string>>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <LinkIcon className="size-5" aria-hidden />
          </span>
          <CardTitle>This link is missing its token</CardTitle>
          <CardDescription>
            The reset link looks incomplete. Open the link from your email again, or request a fresh one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <span
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "color-mix(in oklab, var(--success) 12%, transparent)",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Your new password is set. Sign in to get back to your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const errors: FieldErrors = {};
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (password.length > 72) errors.password = "Password must be at most 72 characters";
    if (confirm !== password) errors.confirm = "Passwords do not match";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setApiError(data?.error ?? "This reset link is invalid or has expired. Request a new one.");
    } catch {
      setApiError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">It must be at least 8 characters long.</p>
      </div>

      {apiError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>{apiError}</AlertTitle>
          <AlertDescription>
            <Link href="/forgot-password" className="font-medium underline underline-offset-2">
              Request a new link
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password}
            disabled={submitting}
          />
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={!!fieldErrors.confirm}
            disabled={submitting}
          />
          {fieldErrors.confirm && <p className="text-sm text-destructive">{fieldErrors.confirm}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Updating password…" : "Update password"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
