"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useLocationWebSocket } from "@/hooks/use-location-websocket";
import type {
  Device,
  DeviceTrackingStatus,
  Location,
  Trip,
  WebSocketMessage,
} from "@/types";

export interface Vehicle {
  id: string;
  name: string;
  type: "truck" | "van" | "car" | "asset";
  status: "moving" | "idle" | "offline";
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  driver: string;
  heading: number;
}

export interface LiveVehicle extends Device {
  status_info: DeviceTrackingStatus | null;
  last_location: Location | null;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
}

export function useLiveMap() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [statuses, setStatuses] = useState<DeviceTrackingStatus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "fair">("excellent");
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const { type, data } = message;

    if (type === "location.updated" && data.device_id) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === data.device_id
            ? {
                ...v,
                last_location: v.last_location
                  ? {
                      ...v.last_location,
                      latitude: data.latitude ?? v.last_location.latitude,
                      longitude: data.longitude ?? v.last_location.longitude,
                      heading: data.heading ?? v.last_location.heading,
                      speed: data.speed ?? v.last_location.speed,
                      battery_level: data.battery_level ?? v.last_location.battery_level,
                      captured_at: data.captured_at ?? v.last_location.captured_at,
                    }
                  : null,
                status_info: v.status_info
                  ? {
                      ...v.status_info,
                      last_latitude: data.latitude ?? v.status_info.last_latitude,
                      last_longitude: data.longitude ?? v.status_info.last_longitude,
                      last_heading: data.heading ?? v.status_info.last_heading,
                      last_speed: data.speed ?? v.status_info.last_speed,
                      last_battery_level: data.battery_level ?? v.status_info.last_battery_level,
                      last_captured_at: data.captured_at ?? v.status_info.last_captured_at,
                    }
                  : null,
              }
            : v
        )
      );
      setTick((t) => t + 1);
    }

    if (type === "device.online" || type === "device.offline") {
      setStatuses((prev) =>
        prev.map((s) =>
          s.device_id === data.device_id
            ? { ...s, status: type === "device.online" ? "online" : "offline" }
            : s
        )
      );
    }

    if (type === "trip.started" && data.trip_id) {
      setTrips((prev) => [
        {
          id: data.trip_id!,
          device_id: data.device_id!,
          organization_id: data.organization_id!,
          start_time: data.start_time ?? new Date().toISOString(),
          end_time: null,
          distance_meters: 0,
          duration_seconds: null,
          avg_speed_kmh: null,
          max_speed_kmh: null,
          idle_duration_seconds: 0,
          point_count: 1,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    if (type === "trip.ended" && data.trip_id) {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === data.trip_id
            ? {
                ...t,
                end_time: data.end_time ?? new Date().toISOString(),
                distance_meters: data.distance_meters ?? t.distance_meters,
                duration_seconds: data.duration_seconds ?? t.duration_seconds,
                status: "completed",
              }
            : t
        )
      );
    }
  }, []);

  const { isConnected } = useLocationWebSocket({
    onMessage: handleMessage,
    onConnect: () => setConnectionQuality("excellent"),
    onDisconnect: () => setConnectionQuality("fair"),
  });

  useEffect(() => {
    if (!isConnected) {
      setConnectionQuality("fair");
    } else {
      setConnectionQuality("excellent");
    }
  }, [isConnected]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deviceData, statusData, tripData] = await Promise.all([
        apiClient.get<{ items: Device[]; total: number }>("/devices?page=1&page_size=100"),
        apiClient.get<DeviceTrackingStatus[]>("/device-statuses"),
        apiClient.get<Trip[]>("/trips"),
      ]);

      const deviceList = deviceData.items;
      const statusMap = new Map(statusData.map((s) => [s.device_id, s]));

      const liveVehicles: LiveVehicle[] = deviceList.map((d) => ({
        ...d,
        status_info: statusMap.get(d.id) ?? null,
        last_location: null,
      }));

      setVehicles(liveVehicles);
      setStatuses(statusData);
      setTrips(tripData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!isLive) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isLive]);

  const getRouteHistory = useCallback(
    async (vehicleId: string): Promise<RoutePoint[]> => {
      try {
        const locations = await apiClient.get<Location[]>(
          `/devices/${vehicleId}/locations?limit=500`
        );
        return locations.map((loc) => ({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date(loc.captured_at).getTime(),
          speed: loc.speed ?? 0,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  const getTripHistory = useCallback(async (tripId: string): Promise<RoutePoint[]> => {
    try {
      const locations = await apiClient.get<Location[]>(`/trips/${tripId}/history`);
      return locations.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: new Date(loc.captured_at).getTime(),
        speed: loc.speed ?? 0,
      }));
    } catch {
      return [];
    }
  }, []);

  return {
    vehicles,
    statuses,
    trips,
    isLive,
    setIsLive,
    connectionQuality,
    tick,
    loading,
    error,
    isConnected,
    getRouteHistory,
    getTripHistory,
    refresh: fetchInitialData,
  };
}
