import { Check } from "lucide-react";
import { Logo } from "@/components/shell/logo";

const VALUE_PROPS = [
  "Real-time dashboards from your first event",
  "Funnels, retention, and revenue in one place",
  "Free up to 100k events every month",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--primary) 88%, black) 0%, color-mix(in oklab, var(--primary) 60%, black) 55%, color-mix(in oklab, var(--primary) 40%, black) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(40rem 24rem at 85% 10%, rgba(255,255,255,0.10), transparent 70%)",
          }}
        />
        <Logo href="/" className="relative text-white [&>span:first-child]:bg-white/15 [&>span:first-child]:text-white" />

        <figure className="relative max-w-md">
          <blockquote className="text-xl leading-relaxed font-medium text-balance">
            &ldquo;We replaced three tools with InsightHub. For the first time, marketing, product, and engineering
            are all arguing from the same numbers.&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm text-white/70">Head of Growth, Meridian</figcaption>
        </figure>

        <ul className="relative space-y-3">
          {VALUE_PROPS.map((prop) => (
            <li key={prop} className="flex items-center gap-3 text-sm text-white/85">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3" aria-hidden />
              </span>
              {prop}
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo href="/" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
