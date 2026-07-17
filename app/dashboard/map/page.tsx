"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Live Map</h1>
        <Badge variant="warning">Coming Soon</Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <MapPin className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Real-time GPS tracking will be available in a future phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
