import {
  LayoutDashboard,
  LineChart,
  Users,
  CircleDollarSign,
  Globe,
  MousePointerClick,
  Filter,
  Grid3x3,
  FileText,
  BellRing,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exactly (overview) vs prefix (section pages). */
  exact?: boolean;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/revenue", label: "Revenue", icon: CircleDollarSign },
  { href: "/dashboard/traffic", label: "Traffic", icon: Globe },
  { href: "/dashboard/events", label: "Events", icon: MousePointerClick },
  { href: "/dashboard/funnels", label: "Funnels", icon: Filter },
  { href: "/dashboard/retention", label: "Retention", icon: Grid3x3 },
];

export const NAV_WORKSPACE: NavItem[] = [
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
