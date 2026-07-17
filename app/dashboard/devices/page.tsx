"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { Device, DeviceCreateInput, DeviceUpdateInput, PaginatedResponse, Team } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Plus, Search, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "success",
  inactive: "secondary",
  maintenance: "warning",
  retired: "destructive",
};

export default function DevicesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["devices", { search, status: statusFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return apiClient.get<PaginatedResponse<Device>>(`/devices?${params}`);
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.get<PaginatedResponse<Team>>("/teams"),
  });

  const createMutation = useMutation({
    mutationFn: (input: DeviceCreateInput) => apiClient.post<Device>("/devices", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeviceUpdateInput }) =>
      apiClient.patch<Device>(`/devices/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setEditDevice(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/devices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const canCreate = hasPermission("devices:create");
  const canEdit = hasPermission("devices:update");
  const canDelete = hasPermission("devices:delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <p className="text-sm text-muted-foreground">Manage your tracked assets</p>
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Device</Button>
            </DialogTrigger>
            <DialogContent>
              <DeviceForm
                teams={teamsData?.items ?? []}
                onSubmit={(input) => createMutation.mutate(input)}
                loading={createMutation.isPending}
                error={createMutation.error instanceof ApiError ? createMutation.error.message : null}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading devices...</p>}
      {error && <p className="text-sm text-destructive">Error: {(error as ApiError).message}</p>}
      {!isLoading && !error && data && data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cpu className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No devices found. {canCreate && "Create your first device to get started."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((device) => (
            <Card key={device.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{device.name}</CardTitle>
                <Badge variant={(STATUS_COLORS[device.status] as "success" | "secondary" | "warning" | "destructive") ?? "secondary"}>
                  {device.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Type: <span className="capitalize">{device.deviceType.replace(/_/g, " ")}</span></p>
                  {device.externalIdentifier && <p>ID: {device.externalIdentifier}</p>}
                  {device.assignedTeamId && <p>Team: {teamsData?.items.find((t) => t.id === device.assignedTeamId)?.name ?? "—"}</p>}
                  {device.lastSeenAt && <p>Last seen: {new Date(device.lastSeenAt).toLocaleString()}</p>}
                </div>
                {(canEdit || canDelete) && (
                  <div className="mt-3 flex gap-2">
                    {canEdit && (
                      <Dialog open={editDevice?.id === device.id} onOpenChange={(open) => !open && setEditDevice(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditDevice(device)}>
                            <Pencil className="mr-1 h-3 w-3" /> Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DeviceForm
                            device={device}
                            teams={teamsData?.items ?? []}
                            onSubmit={(input) => updateMutation.mutate({ id: device.id, input })}
                            loading={updateMutation.isPending}
                            error={updateMutation.error instanceof ApiError ? updateMutation.error.message : null}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete device "${device.name}"?`)) deleteMutation.mutate(device.id);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {Math.ceil(data.total / data.pageSize)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceForm({
  device,
  teams,
  onSubmit,
  loading,
  error,
}: {
  device?: Device;
  teams: Team[];
  onSubmit: (input: DeviceCreateInput) => void;
  loading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(device?.name ?? "");
  const [externalIdentifier, setExternalIdentifier] = useState(device?.externalIdentifier ?? "");
  const [deviceType, setDeviceType] = useState<string>(device?.deviceType ?? "vehicle_tracker");
  const [status, setStatus] = useState<string>(device?.status ?? "active");
  const [assignedTeamId, setAssignedTeamId] = useState<string>(device?.assignedTeamId ?? "none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: DeviceCreateInput = {
      name,
      externalIdentifier: externalIdentifier || undefined,
      deviceType: deviceType as Device["deviceType"],
      assignedTeamId: assignedTeamId === "none" ? undefined : assignedTeamId,
    };
    if (device) {
      (input as DeviceUpdateInput).status = status as Device["status"];
    }
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{device ? "Edit Device" : "Create Device"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="externalId">External Identifier</Label>
          <Input id="externalId" value={externalIdentifier} onChange={(e) => setExternalIdentifier(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Device Type</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle_tracker">Vehicle Tracker</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="iot_gps">IoT GPS</SelectItem>
              <SelectItem value="field_worker">Field Worker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {device && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="team">Assigned Team</Label>
          <Select value={assignedTeamId} onValueChange={setAssignedTeamId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No team</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
