"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  FileText,
  Upload,
  AlertCircle,
} from "lucide-react";
import { useOverviewStats, useQualityMetrics } from "../hooks/useScraperDashboard";

export function StatsCards() {
  const { data: stats, isLoading: statsLoading } = useOverviewStats();
  const { data: quality, isLoading: qualityLoading } = useQualityMetrics();

  if (statsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Pending Approval",
      value: stats?.listings?.pending_approval || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      description: "Awaiting review",
    },
    {
      title: "Approved Today",
      value: stats?.today?.approved || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      description: "Published to Pokojowo",
    },
    {
      title: "Scraped Today",
      value: stats?.today?.scraped || 0,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      description: "New listings found",
    },
    {
      title: "Approval Rate",
      value: `${stats?.approval_rate || 0}%`,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      description: "Overall acceptance",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Scraped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings?.total_scraped || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{stats?.listings?.approved || 0} approved</Badge>
              <Badge variant="outline" className="text-red-600">
                {stats?.listings?.rejected || 0} rejected
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Published to Pokojowo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings?.published || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Live on the platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Jobs Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold">{stats?.jobs?.running || 0}</div>
                <p className="text-xs text-muted-foreground">Running</p>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{stats?.jobs?.completed || 0}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{stats?.jobs?.failed || 0}</div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality */}
      {quality && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Data Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Has Images</span>
                  <span className="text-sm font-medium">{quality.completeness?.with_images || 0}%</span>
                </div>
                <Progress value={quality.completeness?.with_images || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Has Size Info</span>
                  <span className="text-sm font-medium">{quality.completeness?.with_size || 0}%</span>
                </div>
                <Progress value={quality.completeness?.with_size || 0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">High Confidence Classification</span>
                  <span className="text-sm font-medium">{quality.confidence?.room_type_high || 0}%</span>
                </div>
                <Progress value={quality.confidence?.room_type_high || 0} className="h-2" />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>Avg. {quality.averages?.images_per_listing || 0} images/listing</span>
              <span>Avg. {quality.averages?.description_length || 0} chars/description</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
