"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Bell, Search, Command as CommandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  const initials = profile
    ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase()
    : "?";

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "Loading...";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md"
      >
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3.5 py-2 text-sm text-muted-foreground transition-all hover:border-border/80 hover:bg-muted/50"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search devices, trips, alerts...</span>
          <kbd className="flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            <CommandIcon className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </motion.div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>

        <ThemeToggle />

        <div className="mx-1 h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium leading-tight">{fullName}</span>
                <span className="text-[11px] text-muted-foreground">{profile?.email}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1.5">
                <span className="font-medium">{fullName}</span>
                <Badge variant="secondary" className="w-fit capitalize">
                  {profile?.role.replace("_", " ") ?? "—"}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Settings({ className }: { className?: string }) {
  return <LogOut className={className} />;
}
