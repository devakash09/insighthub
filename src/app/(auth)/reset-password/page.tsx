import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    // useSearchParams in the client form requires a Suspense boundary.
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
