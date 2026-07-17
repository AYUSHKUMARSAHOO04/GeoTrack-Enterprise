"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <Badge variant="warning">Coming Soon</Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Bell className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            The alert system will be available in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
