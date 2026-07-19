"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Bell, Filter } from "lucide-react";
import type { Alert, AlertState, AlertSeverity } from "@/types";

const stateColors: Record<AlertState, "default" | "secondary" | "success"> = {
  open: "default",
  acknowledged: "secondary",
  resolved: "success",
};

const severityColors: Record<AlertSeverity, "default" | "warning" | "destructive"> = {
  info: "default",
  warning: "warning",
  critical: "destructive",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertState | "all">("all");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await apiClient.get<Alert[]>("/alerts?limit=100");
        setAlerts(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const acknowledge = async (id: string) => {
    try {
      const updated = await apiClient.post<Alert>(`/alerts/${id}/acknowledge`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to acknowledge");
    }
  };

  const resolve = async (id: string) => {
    try {
      const updated = await apiClient.post<Alert>(`/alerts/${id}/resolve`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resolve");
    }
  };

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.state === filter);

  const counts = {
    open: alerts.filter((a) => a.state === "open").length,
    acknowledged: alerts.filter((a) => a.state === "acknowledged").length,
    resolved: alerts.filter((a) => a.state === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Manage fleet alerts and incidents
          </p>
        </div>
        {error && <Badge variant="destructive">{error}</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Acknowledged
            </CardTitle>
            <Bell className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.acknowledged}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.resolved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          {(["all", "open", "acknowledged", "resolved"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-success" />
              <p className="mt-2 text-sm text-muted-foreground">
                No alerts match this filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant={severityColors[alert.severity]}>
                      {alert.severity}
                    </Badge>
                    <Badge variant={stateColors[alert.state]}>
                      {alert.state}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {alert.state === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {alert.state !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
