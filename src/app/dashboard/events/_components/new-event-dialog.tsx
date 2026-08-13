"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mirrors eventDefinitionSchema (src/lib/validations/resources.ts).
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

type FieldErrors = Partial<Record<"name" | "description", string>>;

function validateName(name: string): string | null {
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 60) return "Name must be 60 characters or fewer";
  if (!NAME_PATTERN.test(name)) return "Use snake_case, e.g. checkout_started";
  return null;
}

/** "New event" trigger + creation dialog for event definitions. */
export function NewEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isConversion, setIsConversion] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setIsConversion(false);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const nameError = validateName(trimmed);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
          isConversion,
        }),
      });

      if (res.status === 422) {
        const body = (await res.json()) as { issues?: { path: string; message: string }[] };
        const fieldErrors: FieldErrors = {};
        for (const issue of body.issues ?? []) {
          if (issue.path === "name" || issue.path === "description") {
            fieldErrors[issue.path] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const message = body?.error ?? "Could not create the event. Try again.";
        if (res.status === 400) setErrors({ name: message });
        else toast.error(message);
        return;
      }

      toast.success(`Event "${trimmed}" created`);
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Could not create the event. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden />
          New event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription>
            Define an event to start tracking it. The name must match what your code sends.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-name">Name</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="checkout_started"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              maxLength={60}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby="event-name-hint"
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : (
              <p id="event-name-hint" className="text-xs text-muted-foreground">
                snake_case, e.g. checkout_started
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="What does this event measure? (optional)"
              rows={3}
              maxLength={300}
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="event-conversion"
              checked={isConversion}
              onCheckedChange={(checked) => setIsConversion(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="event-conversion">This is a conversion event</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Conversion events count toward conversion rates and funnels.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 aria-hidden className="animate-spin" />}
              Create event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
