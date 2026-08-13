"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { signupSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle } from "@/components/ui/alert";

type Field = "name" | "email" | "password" | "orgName";
type FieldErrors = Partial<Record<Field, string>>;

const STRENGTH_CHECKS: { label: string; test: (pw: string) => boolean }[] = [
  { label: "at least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "upper and lower case", test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "a number", test: (pw) => /\d/.test(pw) },
  { label: "a symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function isField(value: unknown): value is Field {
  return value === "name" || value === "email" || value === "password" || value === "orgName";
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [duplicateEmail, setDuplicateEmail] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const passedChecks = STRENGTH_CHECKS.filter((c) => c.test(password)).length;
  const strengthColor = passedChecks >= 3 ? "var(--success)" : "var(--warning)";
  const firstUnmet = STRENGTH_CHECKS.find((c) => !c.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setDuplicateEmail(false);

    const parsed = signupSchema.safeParse({
      name,
      email,
      password,
      orgName: orgName.trim() ? orgName : undefined,
    });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (isField(field) && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.status === 201) {
        const login = await signIn("credentials", {
          email: parsed.data.email,
          password: parsed.data.password,
          redirect: false,
        });
        if (login?.error) {
          // Account exists but auto sign-in failed — send them to the login page.
          router.push("/login");
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.status === 400 && data?.error?.toLowerCase().includes("already exists")) {
        setDuplicateEmail(true);
        setFieldErrors({ email: data.error });
        return;
      }
      setFormError(data?.error ?? "Something went wrong. Try again.");
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start free — no credit card required.</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>{formError}</AlertTitle>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.name}
            disabled={submitting}
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
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
          {fieldErrors.email && (
            <p className="text-sm text-destructive">
              {fieldErrors.email}
              {duplicateEmail && (
                <>
                  {" "}
                  <Link href="/login" className="font-medium underline underline-offset-2">
                    Log in instead
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password}
            disabled={submitting}
          />
          <div className="flex gap-1.5" aria-hidden>
            {STRENGTH_CHECKS.map((check, i) => (
              <span
                key={check.label}
                className="h-1 flex-1 rounded-full bg-muted transition-colors"
                style={i < passedChecks ? { backgroundColor: strengthColor } : undefined}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {password.length === 0
              ? "Use 8+ characters with a mix of cases, numbers, and symbols."
              : firstUnmet
                ? `Add ${firstUnmet.label} to strengthen your password.`
                : "Strong password."}
          </p>
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orgName">
            Workspace name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="orgName"
            placeholder="Acme Inc"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            aria-invalid={!!fieldErrors.orgName}
            disabled={submitting}
          />
          {fieldErrors.orgName && <p className="text-sm text-destructive">{fieldErrors.orgName}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </a>
          .
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
