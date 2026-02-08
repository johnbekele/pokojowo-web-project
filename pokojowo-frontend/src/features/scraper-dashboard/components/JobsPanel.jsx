"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Activity,
} from "lucide-react";
import { useJobs, useCreateJob, useCancelJob } from "../hooks/useScraperDashboard";
import { useToast } from "@/hooks/useToast";
import { formatDistanceToNow } from "date-fns";

const SITES = [
  { value: "olx", label: "OLX.pl" },
  { value: "otodom", label: "Otodom.pl" },
  { value: "gumtree", label: "Gumtree.pl" },
  { value: "all", label: "All Sites" },
];

const CITIES = [
  "warszawa",
  "krakow",
  "wroclaw",
  "poznan",
  "gdansk",
  "lodz",
  "szczecin",
  "katowice",
  "lublin",
  "bialystok",
];

export function JobsPanel() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    site: "olx",
    city: "warszawa",
    max_listings: 50,
    dry_run: false,
  });

  const { toast } = useToast();
  const { data, isLoading, refetch } = useJobs();
  const createMutation = useCreateJob();
  const cancelMutation = useCancelJob();

  const jobs = data?.jobs || [];

  const handleCreateJob = async () => {
    try {
      await createMutation.mutateAsync(newJob);
      toast({
        title: "Job created",
        description: "Scraping job has been started.",
      });
      setCreateDialogOpen(false);
      setNewJob({
        site: "olx",
        city: "warszawa",
        max_listings: 50,
        dry_run: false,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      await cancelMutation.mutateAsync(jobId);
      toast({
        title: "Job cancelled",
        description: "The scraping job has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { variant: "outline", icon: Clock, color: "text-blue-600" },
      running: { variant: "default", icon: Activity, color: "text-yellow-600" },
      completed: { variant: "outline", icon: CheckCircle, color: "text-green-600" },
      failed: { variant: "destructive", icon: XCircle, color: "text-red-600" },
      cancelled: { variant: "outline", icon: Square, color: "text-gray-600" },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Scraping Jobs</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Scraping Job</DialogTitle>
                <DialogDescription>
                  Start a new scraping job to fetch listings from Polish rental sites.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select
                    value={newJob.site}
                    onValueChange={(value) => setNewJob((prev) => ({ ...prev, site: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITES.map((site) => (
                        <SelectItem key={site.value} value={site.value}>
                          {site.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={newJob.city}
                    onValueChange={(value) => setNewJob((prev) => ({ ...prev, city: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city.charAt(0).toUpperCase() + city.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max Listings</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={newJob.max_listings}
                    onChange={(e) =>
                      setNewJob((prev) => ({
                        ...prev,
                        max_listings: parseInt(e.target.value) || 50,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of listings to scrape (1-200)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dry Run</Label>
                    <p className="text-xs text-muted-foreground">
                      Test without adding to approval queue
                    </p>
                  </div>
                  <Switch
                    checked={newJob.dry_run}
                    onCheckedChange={(checked) =>
                      setNewJob((prev) => ({ ...prev, dry_run: checked }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateJob} disabled={createMutation.isPending}>
                  <Play className="h-4 w-4 mr-1" />
                  {createMutation.isPending ? "Starting..." : "Start Job"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No scraping jobs yet</p>
            <p className="text-sm">Create a new job to start scraping listings.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.job_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.site?.toUpperCase()}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="capitalize">{job.city}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.started_at && (
                        <span>
                          Started {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                        </span>
                      )}
                      {job.stats && (
                        <span className="ml-4">
                          {job.stats.processed_successfully || 0} processed
                          {job.stats.duplicates_skipped > 0 && (
                            <>, {job.stats.duplicates_skipped} duplicates</>
                          )}
                        </span>
                      )}
                    </div>
                    {job.error_message && (
                      <p className="text-sm text-red-600">{job.error_message}</p>
                    )}
                  </div>

                  {job.status === "running" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelJob(job.job_id)}
                      disabled={cancelMutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
