"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeviceType, TrafficSource, VisitorStatus } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrencyCompact, formatDate, formatNumber, formatRelative } from "@/lib/format";
import {
  DEVICE_LABELS,
  VisitorStatusBadge,
  nameInitials,
} from "@/app/dashboard/users/_components/visitor-badges";

export interface VisitorRowData {
  id: string;
  name: string | null;
  email: string | null;
  country: string;
  device: DeviceType;
  source: TrafficSource;
  status: VisitorStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  sessionsCount: number;
  totalRevenue: number;
}

/**
 * One visitor row. The whole row is clickable (hover + pointer affordance)
 * while the name itself is a real <Link>, so keyboard and screen-reader users
 * get a proper focusable target.
 */
export function VisitorRow({ visitor }: { visitor: VisitorRowData }) {
  const router = useRouter();
  const href = `/dashboard/users/${visitor.id}`;

  return (
    <TableRow
      onClick={() => router.push(href)}
      className="cursor-pointer hover:bg-accent/50"
    >
      <TableCell className="max-w-[240px]">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px] font-medium">{nameInitials(visitor.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-[13px] font-medium hover:underline"
            >
              {visitor.name ?? "Anonymous"}
            </Link>
            {visitor.email && (
              <span className="block truncate text-xs text-muted-foreground">{visitor.email}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{visitor.country}</TableCell>
      <TableCell>
        <Badge variant="outline">{DEVICE_LABELS[visitor.device]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(visitor.firstSeenAt)}</TableCell>
      <TableCell className="text-muted-foreground">{formatRelative(visitor.lastSeenAt)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(visitor.sessionsCount)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrencyCompact(visitor.totalRevenue)}</TableCell>
      <TableCell>
        <VisitorStatusBadge status={visitor.status} />
      </TableCell>
    </TableRow>
  );
}
