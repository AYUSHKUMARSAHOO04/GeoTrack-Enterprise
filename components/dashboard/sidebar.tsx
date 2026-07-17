"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bell,
  MapPin,
  Settings,
  Users,
  Radio,
  Route,
  Shield,
  FileText,
  LayoutDashboard,
  ChevronLeft,
  Command,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live Map", href: "/dashboard/map", icon: Radio },
  { label: "Devices", href: "/dashboard/devices", icon: MapPin },
  { label: "Trips", href: "/dashboard/trips", icon: Route },
  { label: "Geofences", href: "/dashboard/geofences", icon: Shield },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell, badge: 3 },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "Audit Logs", href: "/dashboard/audit", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 248 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <MapPin className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="text-sm font-semibold tracking-tight">GeoTrack</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Enterprise
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!sidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="px-3 pt-3"
        >
          <button
            onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Quick search...</span>
            <kbd className="ml-auto rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>
        </motion.div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-3 py-3">
        {navItems.map((item, i) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && !sidebarCollapsed && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
                {item.badge && sidebarCollapsed && (
                  <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            sidebarCollapsed && "rotate-180"
          )}
        />
      </button>
    </motion.aside>
  );
}
