/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  Heart,
  Share2,
  LogOut,
  Settings,
  User,
  Calendar,
  Zap,
  BarChart3,
  PlusCircle,
  Activity,
  Eye,
  ThumbsUp,
  Target,
  Sparkles,
  Bot,
  Image as ImageIcon,
  Workflow,
} from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook } from "react-icons/fa";
import { motion } from "framer-motion";
import PostComposer from "@/components/dashboard/PostComposer";
import TelegramConnection from "@/components/dashboard/TelegramConnection";
import FacebookConnection from "@/components/dashboard/FacebookConnection";
import ContentCalendar from "@/components/dashboard/ContentCalendar";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import MediaLibrary from "@/components/dashboard/MediaLibrary";
import HashtagManager from "@/components/dashboard/HashtagManager";
import TemplatesLibrary from "@/components/dashboard/TemplatesLibrary";
import AIEnhancementTool from "@/components/dashboard/AIEnhancementTool";
import AIImageGenerator from "@/components/dashboard/AIImageGenerator";
import AutoPostSettings from "@/components/dashboard/AutoPostSettings";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [greeting, setGreeting] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 156,
    engagement: 28400,
    followers: 12580,
    reach: 89200,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetchConnectedAccounts();
    fetchStats();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch("/api/social/accounts");
      const data = await response.json();
      if (data.success) {
        setConnectedAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/analytics?period=30d");
      const data = await response.json();
      if (data.success && data.data) {
        setStats({
          totalPosts: data.data.total_posts || 0,
          engagement: data.data.total_engagement || 0,
          followers: 12580, // This would come from actual API
          reach: data.data.total_reach || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const platformIcons: Record<string, any> = {
    instagram: FaInstagram,
    twitter: FaTwitter,
    linkedin: FaLinkedin,
    facebook: FaFacebook,
    telegram: Bot,
  };

  const platformColors: Record<string, string> = {
    instagram: "bg-pink-500",
    twitter: "bg-blue-400",
    linkedin: "bg-blue-700",
    facebook: "bg-blue-600",
    telegram: "bg-blue-500",
  };

  const analyticsData = [
    {
      label: "Engagement Rate",
      value: "4.8%",
      change: "+12%",
      icon: Heart,
      color: "text-red-500",
    },
    {
      label: "Total Reach",
      value: stats.reach.toLocaleString(),
      change: "+23%",
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: "Click-through Rate",
      value: "3.2%",
      change: "+5%",
      icon: Target,
      color: "text-green-500",
    },
    {
      label: "Total Posts",
      value: stats.totalPosts.toString(),
      change: "+18%",
      icon: ThumbsUp,
      color: "text-purple-500",
    },
  ];

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SocialHub
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 sm:grid-cols-4 lg:max-w-5xl lg:grid-cols-8">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="composer" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2">
              <Workflow className="h-4 w-4" />
              Auto Post
            </TabsTrigger>
            <TabsTrigger value="ai-tools" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Tools
            </TabsTrigger>
            <TabsTrigger value="connect" className="gap-2">
              <Share2 className="h-4 w-4" />
              Connect
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {greeting}, {userName}! 👋
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Here&apos;s what&apos;s happening with your social media today.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                    onClick={() => setActiveTab("composer")}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Post
                  </Button>
                  <Button variant="outline">
                    <Zap className="mr-2 h-4 w-4" />
                    AI Assistant
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {analyticsData.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.label}
                      </CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.change} from last month
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks to manage your social media
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                        onClick={() => setActiveTab("composer")}
                      >
                        <PlusCircle className="h-5 w-5" />
                        <span>Create Post</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                        onClick={() => setActiveTab("automation")}
                      >
                        <Workflow className="h-5 w-5" />
                        <span>Auto Post</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                        onClick={() => setActiveTab("media")}
                      >
                        <ImageIcon className="h-5 w-5" />
                        <span>Media Library</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                        onClick={() => setActiveTab("analytics")}
                      >
                        <BarChart3 className="h-5 w-5" />
                        <span>View Analytics</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Connected Accounts */}
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                    <CardDescription>
                      Manage your social media profiles
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingAccounts ? (
                      <div className="text-center py-4">
                        <Activity className="h-6 w-6 animate-spin mx-auto" />
                      </div>
                    ) : connectedAccounts.length > 0 ? (
                      connectedAccounts.map((account) => {
                        const Icon = platformIcons[account.platform];
                        const color = platformColors[account.platform];
                        return (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}
                              >
                                {Icon && (
                                  <Icon className="h-5 w-5 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm capitalize">
                                  {account.platform}
                                </p>
                                <p className="text-xs text-gray-500">
                                  @{account.platform_username}
                                </p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500">
                              Connected
                            </Badge>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500 mb-3">
                          No accounts connected yet
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("connect")}
                        >
                          Connect Your First Account
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="ai-tools" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <AIEnhancementTool />
              <AIImageGenerator />
            </div>
          </TabsContent>
          {/* Composer Tab */}
          <TabsContent value="composer" className="space-y-6">
            <PostComposer />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <ContentCalendar />
          </TabsContent>
          <TabsContent value="automation" className="space-y-6">
            <AutoPostSettings />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MediaLibrary />
              </div>
              <div className="space-y-6">
                <HashtagManager />
                <TemplatesLibrary />
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Connect Tab */}
          <TabsContent value="connect" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Facebook Connection */}
              <FacebookConnection onConnected={fetchConnectedAccounts} />

              {/* Telegram Connection */}
              <TelegramConnection onConnected={fetchConnectedAccounts} />
            </div>

            {/* Other Platforms Coming Soon */}
            <Card>
              <CardHeader>
                <CardTitle>Other Platforms (Coming Soon)</CardTitle>
                <CardDescription>
                  Instagram, Twitter, and LinkedIn integration coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {["instagram", "twitter", "linkedin"].map((platform) => {
                    const Icon = platformIcons[platform];
                    const color = platformColors[platform];
                    return (
                      <div
                        key={platform}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}
                          >
                            {Icon && <Icon className="h-4 w-4 text-white" />}
                          </div>
                          <p className="font-medium text-sm capitalize">
                            {platform}
                          </p>
                        </div>
                        <Badge variant="secondary">Coming Soon</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
