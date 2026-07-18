"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, AlertCircle, Activity } from "lucide-react";
import { useLiveMap, type RoutePoint, type Vehicle } from "@/hooks/use-live-map";
import { VehicleMarker } from "@/components/map/vehicle-marker";
import { MapSearchPanel } from "@/components/map/search-panel";
import { MapControls } from "@/components/map/map-controls";
import { VehicleDrawer } from "@/components/map/vehicle-drawer";
import { MiniAnalytics } from "@/components/map/mini-analytics";
import { ConnectionIndicator } from "@/components/map/connection-indicator";
import { PlaybackTimeline } from "@/components/map/playback-timeline";
import { RouteOverlay } from "@/components/map/route-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LiveVehicle } from "@/hooks/use-live-map";

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_ZOOM = 12;

export default function MapPage() {
  const {
    vehicles,
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
    refresh,
  } = useLiveMap();

  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [routeHistory, setRouteHistory] = useState<RoutePoint[]>([]);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPoints, setPlaybackPoints] = useState<RoutePoint[]>([]);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    const liveVehicle = vehicles.find((v) => v.id === vehicle.id);
    if (liveVehicle) {
      setSelectedVehicle(liveVehicle);
      setDrawerOpen(true);
      loadRouteHistory(liveVehicle.id);
    }
  };

  const loadRouteHistory = async (vehicleId: string) => {
    const history = await getRouteHistory(vehicleId);
    setRouteHistory(history);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(20, z + 1));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 1));
  const handleLocate = () => {
    const firstLat = vehicles[0]?.status_info?.last_latitude;
    const firstLng = vehicles[0]?.status_info?.last_longitude;
    if (firstLat != null && firstLng != null) {
      setMapCenter({ lat: firstLat, lng: firstLng });
    } else {
      setMapCenter(DEFAULT_CENTER);
    }
  };

  const handleTrackRoute = () => {
    const lat = selectedVehicle?.status_info?.last_latitude;
    const lng = selectedVehicle?.status_info?.last_longitude;
    if (lat != null && lng != null) {
      setMapCenter({ lat, lng });
    }
  };

  const handleViewHistory = async () => {
    if (!selectedVehicle) return;
    const completedTrips = trips.filter(
      (t) => t.device_id === selectedVehicle.id && t.status === "completed"
    );
    if (completedTrips.length > 0) {
      const points = await getTripHistory(completedTrips[0].id);
      setPlaybackPoints(points);
      setPlaybackMode(true);
      setPlaybackProgress(0);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!playbackMode || !isPlaying) return;

    const interval = 1000 / playbackSpeed;
    playbackTimerRef.current = setInterval(() => {
      setPlaybackProgress((p) => {
        if (p >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return p + 100 / playbackPoints.length;
      });
    }, interval);

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [playbackMode, isPlaying, playbackSpeed, playbackPoints.length]);

  const closePlayback = () => {
    setPlaybackMode(false);
    setPlaybackProgress(0);
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };

  const getVehiclePosition = (vehicle: LiveVehicle): { x: number; y: number } => {
    const status = vehicle.status_info;
    const lat = status?.last_latitude ?? mapCenter.lat;
    const lng = status?.last_longitude ?? mapCenter.lng;
    const deltaLat = lat - mapCenter.lat;
    const deltaLng = lng - mapCenter.lng;
    const scale = Math.pow(2, zoom) * 100;
    return {
      x: 50 + (deltaLng * scale) / 100,
      y: 50 - (deltaLat * scale * 1.3) / 100,
    };
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading live map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button onClick={refresh} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Live Map</h1>
          <Badge variant={isConnected ? "success" : "warning"}>
            {isConnected ? "Connected" : "Reconnecting..."}
          </Badge>
        </div>
        <Button
          variant={isLive ? "default" : "outline"}
          size="sm"
          onClick={() => setIsLive(!isLive)}
        >
          <Activity className="mr-2 h-3.5 w-3.5" />
          {isLive ? "Live" : "Paused"}
        </Button>
      </div>

      <div className="relative h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-[#0a0e14]">
        {/* Map background */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: showSatellite
              ? "radial-gradient(ellipse at center, #1a2a1a 0%, #0a0e14 100%)"
              : "radial-gradient(ellipse at center, #0d1521 0%, #060a0f 100%)",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(215 28% 17% / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(215 28% 17% / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${Math.pow(2, zoom) * 10}px ${Math.pow(2, zoom) * 10}px`,
          }}
        />

        {vehicles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <MapPin className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No devices with location data yet. Issue device credentials and start sending GPS pings.
            </p>
          </div>
        ) : (
          <>
            {/* Route overlay for playback or selected vehicle */}
            {playbackMode && playbackPoints.length > 1 ? (
              <RouteOverlay
                points={playbackPoints}
                mapCenter={mapCenter}
                zoom={zoom}
                progress={playbackProgress / 100}
              />
            ) : (
              routeHistory.length > 1 && (
                <RouteOverlay
                  points={routeHistory}
                  mapCenter={mapCenter}
                  zoom={zoom}
                />
              )
            )}

            {/* Vehicle markers */}
            {vehicles.map((vehicle, index) => {
              const pos = getVehiclePosition(vehicle);
              const status = vehicle.status_info?.status ?? "offline";
              const speed = vehicle.status_info?.last_speed ?? 0;
              const battery = vehicle.status_info?.last_battery_level ?? 0;
              const vehicleData: Vehicle = {
                id: vehicle.id,
                name: vehicle.name,
                type: (vehicle.device_type as "truck" | "van" | "car" | "asset") || "truck",
                status: status as "moving" | "idle" | "offline",
                lat: vehicle.status_info?.last_latitude ?? 0,
                lng: vehicle.status_info?.last_longitude ?? 0,
                speed,
                battery,
                driver: vehicle.external_identifier ?? "Unassigned",
                heading: vehicle.status_info?.last_heading ?? 0,
              };
              return (
                <VehicleMarker
                  key={vehicle.id}
                  vehicle={vehicleData}
                  x={pos.x}
                  y={pos.y}
                  isSelected={selectedVehicle?.id === vehicle.id}
                  onClick={() => handleSelectVehicle(vehicleData)}
                  index={index}
                />
              );
            })}
          </>
        )}

        {/* UI overlays */}
        <ConnectionIndicator
          quality={connectionQuality}
          isLive={isLive}
          tick={tick}
        />

        <MapSearchPanel
          vehicles={vehicles.map((v) => ({
            id: v.id,
            name: v.name,
            type: (v.device_type as "truck" | "van" | "car" | "asset") || "truck",
            status: (v.status_info?.status ?? "offline") as "moving" | "idle" | "offline",
            lat: v.status_info?.last_latitude ?? 0,
            lng: v.status_info?.last_longitude ?? 0,
            speed: v.status_info?.last_speed ?? 0,
            battery: v.status_info?.last_battery_level ?? 0,
            driver: v.external_identifier ?? "Unassigned",
            heading: v.status_info?.last_heading ?? 0,
          }))}
          onSelectVehicle={handleSelectVehicle}
        />

        <MapControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocate={handleLocate}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          showSatellite={showSatellite}
          onToggleSatellite={() => setShowSatellite(!showSatellite)}
        />

        <MiniAnalytics
          vehicles={vehicles.map((v) => ({
            id: v.id,
            name: v.name,
            type: (v.device_type as "truck" | "van" | "car" | "asset") || "truck",
            status: (v.status_info?.status ?? "offline") as "moving" | "idle" | "offline",
            lat: v.status_info?.last_latitude ?? 0,
            lng: v.status_info?.last_longitude ?? 0,
            speed: v.status_info?.last_speed ?? 0,
            battery: v.status_info?.last_battery_level ?? 0,
            driver: v.external_identifier ?? "Unassigned",
            heading: v.status_info?.last_heading ?? 0,
          }))}
          tick={tick}
        />

        {playbackMode && (
          <PlaybackTimeline
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            progress={playbackProgress}
            onProgressChange={setPlaybackProgress}
            speed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            currentTime={
              playbackPoints.length > 0
                ? new Date(
                    playbackPoints[Math.floor((playbackProgress / 100) * playbackPoints.length)]?.timestamp ?? 0
                  ).toLocaleTimeString()
                : "00:00"
            }
            totalTime={
              playbackPoints.length > 0
                ? new Date(playbackPoints[playbackPoints.length - 1]?.timestamp ?? 0).toLocaleTimeString()
                : "00:00"
            }
          />
        )}

        {playbackMode && (
          <button
            onClick={closePlayback}
            className="absolute right-4 top-20 z-30 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl hover:bg-white/10"
          >
            Exit Playback
          </button>
        )}

        <VehicleDrawer
          vehicle={
            selectedVehicle
              ? {
                  id: selectedVehicle.id,
                  name: selectedVehicle.name,
                  type: (selectedVehicle.device_type as "truck" | "van" | "car" | "asset") || "truck",
                  status: (selectedVehicle.status_info?.status ?? "offline") as "moving" | "idle" | "offline",
                  lat: selectedVehicle.status_info?.last_latitude ?? 0,
                  lng: selectedVehicle.status_info?.last_longitude ?? 0,
                  speed: selectedVehicle.status_info?.last_speed ?? 0,
                  battery: selectedVehicle.status_info?.last_battery_level ?? 0,
                  driver: selectedVehicle.external_identifier ?? "Unassigned",
                  heading: selectedVehicle.status_info?.last_heading ?? 0,
                }
              : null
          }
          routeHistory={routeHistory}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onTrackRoute={handleTrackRoute}
          onViewHistory={handleViewHistory}
        />
      </div>
    </div>
  );
}
