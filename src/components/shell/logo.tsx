import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark: an indigo spark glyph + "InsightHub". */
export function Logo({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20V8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">InsightHub</span>
    </Link>
  );
}
