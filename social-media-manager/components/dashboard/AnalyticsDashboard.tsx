/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  Share2,
  MessageCircle,
  Eye,
  Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  total_reach: number;
  total_engagement: number;
  total_followers: number;
  engagement_rate: number;
  posts_count: number;
  daily_stats: Array<{ date: string; engagement: number; reach: number }>;
  platform_breakdown: Record<
    string,
    { engagement: number; reach: number; posts: number }
  >;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?period=${period}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    window.open(`/api/analytics/export?period=${period}`, "_blank");
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-12">No data available</div>;
  }

  const stats = [
    {
      label: "Total Reach",
      value: data.total_reach.toLocaleString(),
      icon: Eye,
      change: "+12%",
      trend: "up",
    },
    {
      label: "Total Engagement",
      value: data.total_engagement.toLocaleString(),
      icon: Heart,
      change: "+8%",
      trend: "up",
    },
    {
      label: "Total Followers",
      value: data.total_followers.toLocaleString(),
      icon: Users,
      change: "+5%",
      trend: "up",
    },
    {
      label: "Engagement Rate",
      value: `${data.engagement_rate}%`,
      icon: TrendingUp,
      change: "+2%",
      trend: "up",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={period === "7d" ? "default" : "outline"}
            onClick={() => setPeriod("7d")}
          >
            7 Days
          </Button>
          <Button
            variant={period === "30d" ? "default" : "outline"}
            onClick={() => setPeriod("30d")}
          >
            30 Days
          </Button>
          <Button
            variant={period === "90d" ? "default" : "outline"}
            onClick={() => setPeriod("90d")}
          >
            90 Days
          </Button>
        </div>
        <Button variant="outline" onClick={exportReport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {stat.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="platforms">
        <TabsList>
          <TabsTrigger value="platforms">Platform Breakdown</TabsTrigger>
          <TabsTrigger value="daily">Daily Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="platforms" className="space-y-4">
          {Object.entries(data.platform_breakdown).map(([platform, stats]) => (
            <Card key={platform}>
              <CardHeader>
                <CardTitle className="capitalize">{platform}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Posts</p>
                    <p className="text-xl font-bold">{stats.posts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Engagement</p>
                    <p className="text-xl font-bold">
                      {stats.engagement.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reach</p>
                    <p className="text-xl font-bold">
                      {stats.reach.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="daily">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {data.daily_stats.slice(0, 10).map((day, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                  >
                    <span className="text-sm">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-sm">
                        ❤️ {day.engagement.toLocaleString()}
                      </span>
                      <span className="text-sm">
                        👁️ {day.reach.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
