"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type {
  Team,
  TeamCreate,
  TeamUpdate,
  PaginatedResponse,
  TeamMemberResponse,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";

export default function TeamsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.get<PaginatedResponse<Team>>("/teams"),
  });

  const { data: membersData } = useQuery({
    queryKey: ["teams", selectedTeam?.id, "members"],
    queryFn: () => apiClient.get<TeamMemberResponse[]>(`/teams/${selectedTeam!.id}/members`),
    enabled: !!selectedTeam,
  });

  const createMutation = useMutation({
    mutationFn: (input: TeamCreate) => apiClient.post<Team>("/teams", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamUpdate }) =>
      apiClient.patch<Team>(`/teams/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setEditTeam(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const canCreate = hasPermission("teams:create");
  const canEdit = hasPermission("teams:update");
  const canDelete = hasPermission("teams:delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage your organization teams</p>
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <TeamForm
                onSubmit={(input) => createMutation.mutate(input)}
                loading={createMutation.isPending}
                error={createMutation.error instanceof ApiError ? createMutation.error.message : null}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading teams...</p>}
      {error && <p className="text-sm text-destructive">Error: {(error as ApiError).message}</p>}
      {!isLoading && !error && data && data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No teams found. {canCreate && "Create your first team to get started."}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((team) => (
            <Card
              key={team.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedTeam(team)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{team.name}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {team.description ?? "No description"}
                </p>
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <Dialog
                      open={editTeam?.id === team.id}
                      onOpenChange={(open) => !open && setEditTeam(null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditTeam(team)}>
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <TeamForm
                          team={team}
                          onSubmit={(input) => updateMutation.mutate({ id: team.id, input })}
                          loading={updateMutation.isPending}
                          error={
                            updateMutation.error instanceof ApiError
                              ? updateMutation.error.message
                              : null
                          }
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete team "${team.name}"?`)) deleteMutation.mutate(team.id);
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} — Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {!membersData && <p className="text-sm text-muted-foreground">Loading members...</p>}
            {membersData && membersData.length === 0 && (
              <p className="text-sm text-muted-foreground">No members in this team.</p>
            )}
            {membersData && membersData.length > 0 && (
              <div className="space-y-2">
                {membersData.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <Badge variant={m.role === "lead" ? "default" : "secondary"}>{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamForm({
  team,
  onSubmit,
  loading,
  error,
}: {
  team?: Team;
  onSubmit: (input: TeamCreate) => void;
  loading: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{team ? "Edit Team" : "Create Team"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Team Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
