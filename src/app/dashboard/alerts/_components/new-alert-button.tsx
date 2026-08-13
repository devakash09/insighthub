"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertFormDialog } from "./alert-form-dialog";

export function NewAlertButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        New alert
      </Button>
      <AlertFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
