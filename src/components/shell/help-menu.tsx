"use client";

import { BookOpen, CircleHelp, Keyboard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Help">
          <CircleHelp aria-hidden className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help &amp; resources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <BookOpen aria-hidden className="h-4 w-4" />
            Documentation
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Press Ctrl+K (or Cmd+K) to search from anywhere.")}>
          <Keyboard aria-hidden className="h-4 w-4" />
          Keyboard shortcuts
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Thanks! Our team will reach out shortly.")}>
          <MessageCircle aria-hidden className="h-4 w-4" />
          Contact support
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
