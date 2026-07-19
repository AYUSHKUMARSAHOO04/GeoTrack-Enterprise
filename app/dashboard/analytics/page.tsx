"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Route,
  AlertTriangle,
  Cpu,
  Gauge,
} from "lucide-react";
import type { FleetAnalytics, TrendPoint, TopDevice } from "@/types";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<FleetAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [topDevices, setTopDevices] = useState<TopDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fleet, trend, top] = await Promise.all([
          apiClient.get<FleetAnalytics>("/analytics/fleet"),
          apiClient.get<TrendPoint[]>("/analytics/trends").catch(() => [] as TrendPoint[]),
          apiClient.get<TopDevice[]>("/analytics/top-devices").catch(() => [] as TopDevice[]),
        ]);
        setAnalytics(fleet);
        setTrends(trend);
        setTopDevices(top);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: "Total Devices",
      value: analytics?.total_devices,
      icon: Cpu,
      color: "text-primary",
    },
    {
      label: "Active Devices",
      value: analytics?.active_devices,
      icon: Activity,
      color: "text-success",
    },
    {
      label: "Fleet Utilization",
      value: analytics ? `${analytics.fleet_utilization_pct}%` : undefined,
      icon: Gauge,
      color: "text-primary",
    },
    {
      label: "Avg Speed",
      value: analytics ? `${analytics.avg_speed_kmh.toFixed(1)} km/h` : undefined,
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "Trips Today",
      value: analytics?.trips_today,
      icon: Route,
      color: "text-warning",
    },
    {
      label: "Distance Today",
      value: analytics
        ? `${(analytics.distance_today_meters / 1000).toFixed(1)} km`
        : undefined,
      icon: BarChart3,
      color: "text-primary",
    },
    {
      label: "Alerts Today",
      value: analytics?.alerts_today,
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      label: "Open Alerts",
      value: analytics?.alerts_open,
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real-time fleet performance metrics
          </p>
        </div>
        {error && <Badge variant="destructive">{error}</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value ?? "—"}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              7-Day Fleet Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data available.</p>
            ) : (
              <div className="space-y-3">
                {trends.map((trend) => (
                  <div
                    key={trend.date}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(trend.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trend.trips_count} trips · {trend.alerts_count} alerts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {trend.active_devices} active
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trend.fleet_utilization_pct}% util
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Top Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : topDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No device activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {topDevices.map((device, idx) => (
                  <div
                    key={device.device_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {device.device_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {device.trip_count} trips
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(device.total_distance_meters / 1000).toFixed(1)} km
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {device.max_speed_kmh.toFixed(0)} km/h max
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
