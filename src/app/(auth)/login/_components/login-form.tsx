"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEMO_ACCOUNTS = [
  { role: "Owner", email: "owner@insighthub.demo" },
  { role: "Admin", email: "admin@insighthub.demo" },
  { role: "Analyst", email: "analyst@insighthub.demo" },
  { role: "Viewer", email: "viewer@insighthub.demo" },
];

const DEMO_PASSWORD = "demo1234";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm({ noWorkspace }: { noWorkspace: boolean }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "email" || field === "password") && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (res?.error) {
        setFormError("Invalid email or password");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your InsightHub workspace.</p>
      </div>

      {noWorkspace && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>No workspace found</AlertTitle>
          <AlertDescription>Your account has no workspace. Sign up again or ask for an invite.</AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>{formError}</AlertTitle>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            disabled={submitting}
          />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password}
            disabled={submitting}
          />
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">Try the live demo</CardTitle>
          <CardDescription>Click a role to fill the form. All demo accounts use the password demo1234.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account.email)}
              disabled={submitting}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              <span className="font-medium">{account.role}</span>
              <span className="text-muted-foreground">{account.email}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        New to InsightHub?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
