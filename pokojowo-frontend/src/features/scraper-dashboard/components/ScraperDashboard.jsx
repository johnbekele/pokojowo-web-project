"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  ClipboardCheck,
  Activity,
  Settings,
  RefreshCw,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { StatsCards } from "./StatsCards";
import { ApprovalQueue } from "./ApprovalQueue";
import { JobsPanel } from "./JobsPanel";
import {
  useRecentActivity,
  useStatsBySite,
  useTimelineStats,
  useQueueStats,
  useApproveAllPending,
} from "../hooks/useScraperDashboard";
import { useToast } from "@/hooks/useToast";
import { formatDistanceToNow } from "date-fns";

export function ScraperDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: activity, refetch: refetchActivity } = useRecentActivity(15);
  const { data: bySite } = useStatsBySite();
  const { data: timeline } = useTimelineStats(7);
  const { data: queueStats } = useQueueStats();

  const approveAllMutation = useApproveAllPending();

  const handleApproveAll = async () => {
    try {
      const result = await approveAllMutation.mutateAsync({ limit: 50 });
      toast({
        title: "Listings approved",
        description: `${result.modified_count} listings approved and queued for publishing.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve listings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scraper Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor, review, and approve scraped rental listings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {queueStats?.status_counts?.pending || 0} pending
          </Badge>
          {(queueStats?.status_counts?.pending || 0) > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApproveAll}
              disabled={approveAllMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {approveAllMutation.isPending ? "Approving..." : "Approve All"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-[600px] grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-1">
            <ClipboardCheck className="h-4 w-4" />
            Approval
            {(queueStats?.status_counts?.pending || 0) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {queueStats.status_counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <StatsCards />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Stats by Site */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">By Source Site</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bySite &&
                    Object.entries(bySite).map(([site, stats]) => (
                      <div key={site} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              site === "olx"
                                ? "bg-green-100"
                                : site === "otodom"
                                ? "bg-blue-100"
                                : "bg-orange-100"
                            }
                          >
                            {site.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-right text-sm">
                          <div>{stats.scraped} scraped</div>
                          <div className="text-muted-foreground">
                            {stats.approval_rate}% approved
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Jobs Panel Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("jobs")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <JobsPanel />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => refetchActivity()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {activity?.activities?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div
                          className={`p-1.5 rounded-full ${
                            item.action === "approved" || item.action === "completed"
                              ? "bg-green-100 text-green-600"
                              : item.action === "rejected" || item.action === "failed"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {item.type === "job" ? (
                            <Activity className="h-3 w-3" />
                          ) : item.action === "approved" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.type === "job" ? "Job " : "Listing "}
                            {item.action}
                            {item.timestamp && (
                              <>
                                {" • "}
                                {formatDistanceToNow(new Date(item.timestamp), {
                                  addSuffix: true,
                                })}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!activity?.activities || activity.activities.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">
                        No recent activity
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Approval Tab */}
        <TabsContent value="approval">
          <ApprovalQueue />
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <div className="max-w-4xl">
            <JobsPanel />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Scraper Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Rate Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    Maximum requests per minute per site
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>OLX</span>
                      <span>30 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Otodom</span>
                      <span>20 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gumtree</span>
                      <span>25 req/min</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Auto-Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve listings meeting quality thresholds
                  </p>
                  <Badge variant="outline">Disabled</Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Scheduled Scraping</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic daily scraping schedule
                  </p>
                  <Badge variant="outline">Disabled</Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">API Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Connection to scraper backend
                  </p>
                  <Badge variant="default" className="bg-green-600">Connected</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ScraperDashboard;
