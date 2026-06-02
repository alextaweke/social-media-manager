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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Users,
  Heart,
  Share2,
  MessageCircle,
  MoreVertical,
  LogOut,
  Settings,
  User,
  Calendar,
  Clock,
  Zap,
  Brain,
  BarChart3,
  PlusCircle,
  ChevronRight,
  Activity,
  Eye,
  ThumbsUp,
  Target,
  Sparkles,
  Bot,
} from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook } from "react-icons/fa";
import Link from "next/link";
import { motion } from "framer-motion";
import PostComposer from "@/components/dashboard/PostComposer";
import TelegramConnection from "@/components/dashboard/TelegramConnection";
import { toast } from "sonner";
import FacebookConnection from "@/components/dashboard/FacebookConnection";
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetchConnectedAccounts();
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

  const recentPosts = [
    {
      id: 1,
      content:
        "Just launched our new AI-powered social media tool! 🚀 #AI #SocialMedia",
      platform: "twitter",
      engagement: 234,
      time: "2 hours ago",
    },
    {
      id: 2,
      content: "5 tips to boost your Instagram engagement in 2024 📸",
      platform: "instagram",
      engagement: 1240,
      time: "5 hours ago",
    },
    {
      id: 3,
      content:
        "The future of social media marketing is here. Learn how AI can help you grow.",
      platform: "linkedin",
      engagement: 89,
      time: "1 day ago",
    },
  ];

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
      value: "89.2K",
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
      label: "Avg Engagement",
      value: "1,240",
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
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>

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
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

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
                    Heres whats happening with your social media today.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
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
              {/* Main Content - Post Composer */}
              <div className="lg:col-span-2 space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <PostComposer />
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Recent Posts</CardTitle>
                          <CardDescription>
                            Your latest social media activity
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                          View All
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentPosts.map((post) => {
                          const Icon = platformIcons[post.platform];
                          return (
                            <div
                              key={post.id}
                              className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex-shrink-0">
                                {Icon && <Icon className="h-5 w-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                  {post.content}
                                </p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <div className="flex items-center space-x-1">
                                    <Heart className="h-3 w-3 text-red-500" />
                                    <span className="text-xs text-gray-500">
                                      {post.engagement}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {post.time}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {/* AI Insights Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border-0">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">AI Insights</CardTitle>
                      </div>
                      <CardDescription>
                        Personalized recommendations for you
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Best time to post</p>
                        <div className="flex items-center space-x-2 text-2xl font-bold text-blue-600">
                          <Clock className="h-5 w-5" />
                          <span>10:00 AM</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Your audience is most active at this time
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Top performing hashtags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {["#SocialMedia", "#Marketing", "#AI", "#Growth"].map(
                            (tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer hover:bg-blue-100"
                              >
                                {tag}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Content Ideas
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Connected Accounts */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
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
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveTab("connect")}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Account
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                      <CardDescription>
                        Last 30 days performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Total Posts</span>
                        </div>
                        <span className="font-bold">{stats.totalPosts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Engagement</span>
                        </div>
                        <span className="font-bold">
                          {stats.engagement.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-500" />
                          <span className="text-sm">New Followers</span>
                        </div>
                        <span className="font-bold">
                          +{stats.followers.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">Total Reach</span>
                        </div>
                        <span className="font-bold">
                          {stats.reach.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="connect" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* OAuth Platforms Card - Keep this for display only */}
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Platforms</CardTitle>
                  <CardDescription>
                    Connect your social media accounts using OAuth
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["instagram", "twitter", "linkedin", "facebook"].map(
                    (platform) => {
                      const isConnected = connectedAccounts.some(
                        (acc) => acc.platform === platform,
                      );
                      const Icon = platformIcons[platform];
                      const color = platformColors[platform];
                      return (
                        <div
                          key={platform}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}
                            >
                              {Icon && <Icon className="h-5 w-5 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm capitalize">
                                {platform}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isConnected ? "Connected" : "Not connected"}
                              </p>
                            </div>
                          </div>
                          {isConnected ? (
                            <Badge variant="default" className="bg-green-500">
                              Connected
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled // Disabled because OAuth not implemented yet
                            >
                              Connect (Coming Soon)
                            </Button>
                          )}
                        </div>
                      );
                    },
                  )}
                </CardContent>
              </Card>

              {/* Facebook Connection - Dedicated Component */}
              <FacebookConnection onConnected={fetchConnectedAccounts} />
            </div>

            {/* Telegram Connection - Already there */}
            <div className="mt-6">
              <TelegramConnection onConnected={fetchConnectedAccounts} />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Detailed analytics coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Advanced Analytics Coming Soon
                  </h3>
                  <p className="text-gray-500">
                    Were working on bringing you detailed analytics across all
                    platforms
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
