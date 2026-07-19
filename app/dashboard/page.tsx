"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Cpu,
  Users,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Gauge,
  Route,
} from "lucide-react";
import Link from "next/link";
import type { FleetAnalytics, Alert, Trip } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<FleetAnalytics | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsData, alertsData, tripsData] = await Promise.all([
          apiClient.get<FleetAnalytics>("/analytics/fleet"),
          apiClient.get<Alert[]>("/alerts?limit=5"),
          apiClient.get<Trip[]>("/trips?limit=5"),
        ]);
        setAnalytics(analyticsData);
        setRecentAlerts(alertsData);
        setRecentTrips(tripsData);
      } catch {
        // silently fail — dashboard still renders with placeholders
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: "Active Devices",
      value: analytics?.active_devices ?? "—",
      icon: Cpu,
      href: "/dashboard/devices",
      color: "text-primary",
    },
    {
      label: "Moving Now",
      value: analytics?.moving_devices ?? "—",
      icon: Activity,
      href: "/dashboard/map",
      color: "text-success",
    },
    {
      label: "Trips Today",
      value: analytics?.trips_today ?? "—",
      icon: Route,
      href: "/dashboard/map",
      color: "text-warning",
    },
    {
      label: "Open Alerts",
      value: analytics?.alerts_open ?? "—",
      icon: AlertTriangle,
      href: "/dashboard/alerts",
      color: "text-destructive",
    },
  ];

  const secondaryStats = [
    {
      label: "Fleet Utilization",
      value: analytics ? `${analytics.fleet_utilization_pct}%` : "—",
      icon: Gauge,
      color: "text-primary",
    },
    {
      label: "Avg Speed",
      value: analytics ? `${analytics.avg_speed_kmh} km/h` : "—",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "Distance Today",
      value: analytics
        ? `${(analytics.distance_today_meters / 1000).toFixed(1)} km`
        : "—",
      icon: MapPin,
      color: "text-warning",
    },
    {
      label: "Active Geofences",
      value: analytics?.geofences_active ?? "—",
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name}</h1>
        <p className="text-sm text-muted-foreground">
          {user?.organization?.name} ·{" "}
          <Badge variant="secondary" className="capitalize">
            {user?.role}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stat.value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryStats.map((stat) => {
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
                <p className="text-2xl font-bold">
                  {loading ? "..." : stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent alerts.
              </p>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.triggered_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : alert.severity === "warning"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTrips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent trips.</p>
            ) : (
              <div className="space-y-2">
                {recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {trip.device_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trip.start_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(trip.distance_meters / 1000).toFixed(1)} km
                      </p>
                      <Badge variant="secondary">{trip.status}</Badge>
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
