/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle,
  Trash2,
  Bot,
  Loader2,
  Plus,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: string;
  source?: string;
}

interface Settings {
  auto_post_enabled: boolean;
  auto_post_schedule: string;
  auto_post_time: string;
  auto_post_platforms: string[];
  auto_post_topics: string[];
}

const availablePlatforms = [
  { id: "twitter", name: "Twitter", icon: FaTwitter, color: "bg-blue-400" },
  { id: "facebook", name: "Facebook", icon: FaFacebook, color: "bg-blue-600" },
  {
    id: "instagram",
    name: "Instagram",
    icon: FaInstagram,
    color: "bg-pink-500",
  },
  { id: "telegram", name: "Telegram", icon: Bot, color: "bg-blue-500" },
];

const topics = [
  "Social Media Tips",
  "Digital Marketing News",
  "Product Updates",
  "Customer Success Stories",
  "Industry Trends",
  "Behind the Scenes",
  "Educational Content",
  "Motivational Quotes",
];

export default function AutoPostSettings() {
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState("daily");
  const [postTime, setPostTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showManualSchedule, setShowManualSchedule] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualPlatforms, setManualPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchScheduledPosts();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/ai/settings");
      const data = await response.json();
      if (data.success && data.settings) {
        const settings = data.settings as Settings;
        setEnabled(settings.auto_post_enabled || false);
        setSchedule(settings.auto_post_schedule || "daily");
        setPostTime(settings.auto_post_time || "09:00");
        setSelectedPlatforms(settings.auto_post_platforms || []);
        setSelectedTopics(settings.auto_post_topics || []);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch("/api/posts/scheduled");
      const data = await response.json();
      if (data.success) {
        setScheduledPosts(
          (data.posts || []).map((post: any) => ({
            ...post,
            platforms: Array.isArray(post.platforms) ? post.platforms : [],
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
    }
  };

  const saveSettings = async () => {
    if (enabled && selectedTopics.length === 0) {
      toast.error("Please select at least one topic for auto-posting");
      return;
    }

    if (enabled && selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform for auto-posting");
      return;
    }

    setSaving(true);
    try {
      // ✅ FIX: Use the correct endpoint for auto-post settings
      const response = await fetch("/api/ai/auto-post/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          schedule,
          time: postTime,
          platforms: selectedPlatforms,
          topics: selectedTopics,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(
          enabled ? "Auto-posting enabled!" : "Auto-posting disabled",
        );
        fetchScheduledPosts();
      } else {
        throw new Error(data.error || "Failed to save settings");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const scheduleManualPost = async () => {
    if (!manualContent || !manualContent.trim()) {
      toast.error("Please enter post content");
      return;
    }

    if (!manualDate) {
      toast.error("Please select a date and time");
      return;
    }

    if (manualPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (new Date(manualDate) < new Date()) {
      toast.error("Scheduled date must be in the future");
      return;
    }

    try {
      const response = await fetch("/api/posts/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: manualContent,
          platforms: manualPlatforms,
          scheduled_for: manualDate,
          media_urls: [],
          is_recurring: false,
          recurring_pattern: null,
          tags: [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Post scheduled successfully!");
        setManualContent("");
        setManualDate("");
        setManualPlatforms([]);
        setShowManualSchedule(false);
        fetchScheduledPosts();
      } else {
        throw new Error(data.error || "Failed to schedule post");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule post");
    }
  };

  const toggleManualPlatform = (platformId: string) => {
    setManualPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId],
    );
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId],
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const cancelScheduledPost = async (postId: string, source?: string) => {
    try {
      const response = await fetch("/api/posts/scheduled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, source: source || "manual" }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Scheduled post cancelled");
        fetchScheduledPosts();
      } else {
        throw new Error(data.error || "Failed to cancel post");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel post");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Auto-Posting Schedule
          </CardTitle>
          <CardDescription>
            Let AI automatically create and publish content for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label className="font-semibold">Enable Auto-Posting</Label>
              <p className="text-sm text-gray-500">
                AI will generate and post content automatically
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Posting Frequency
                  </Label>
                  <Select value={schedule} onValueChange={setSchedule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Same day)</SelectItem>
                      <SelectItem value="custom">Custom Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Posting Time
                  </Label>
                  <Input
                    type="time"
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms to Post On</Label>
                <div className="flex flex-wrap gap-3">
                  {availablePlatforms.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);

                    return (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                          isSelected
                            ? `${platform.color} scale-105 text-white shadow-md`
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <Badge
                      key={topic}
                      variant={
                        selectedTopics.includes(topic) ? "default" : "outline"
                      }
                      className={`cursor-pointer px-3 py-1 ${
                        selectedTopics.includes(topic)
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleTopic(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  AI will generate content about these topics for your scheduled
                  posts
                </p>
              </div>
            </>
          )}

          <Button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Auto-Post Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Manual Schedule
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualSchedule(!showManualSchedule)}
            >
              {showManualSchedule ? "Cancel" : "Schedule Post"}
            </Button>
          </CardTitle>
          <CardDescription>Schedule a one-off post manually</CardDescription>
        </CardHeader>
        {showManualSchedule && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Input
                placeholder="What do you want to post?"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = manualPlatforms.includes(platform.id);

                  return (
                    <button
                      key={platform.id}
                      onClick={() => toggleManualPlatform(platform.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all ${
                        isSelected
                          ? `${platform.color} text-white shadow-md`
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={scheduleManualPost}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Post
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Scheduled Posts List */}
      {scheduledPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Posts
            </CardTitle>
            <CardDescription>
              Posts queued for automatic publishing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 border rounded-lg hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(post.platforms || []).map((platform) => {
                          const p = availablePlatforms.find(
                            (a) => a.id === platform,
                          );
                          const Icon = p?.icon;
                          return (
                            <Badge
                              key={platform}
                              variant="secondary"
                              className="gap-1"
                            >
                              {Icon && <Icon className="h-3.5 w-3.5" />}
                              {p?.name || platform}
                            </Badge>
                          );
                        })}
                        {(post.platforms || []).length === 0 && (
                          <Badge variant="secondary">No platform set</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(post.scheduled_for)}
                        </span>
                        <Badge
                          variant={
                            post.status === "pending" ||
                            post.status === "scheduled"
                              ? "outline"
                              : "default"
                          }
                        >
                          {post.status || "pending"}
                        </Badge>
                        {post.source === "auto" && (
                          <Badge variant="secondary" className="text-xs">
                            🤖 AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelScheduledPost(post.id, post.source)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      {!enabled && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Auto-posting is currently disabled
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Enable auto-posting to let AI create and schedule content for
                  you. You can choose topics, platforms, and posting frequency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Preview */}
      {enabled && selectedPlatforms.length > 0 && selectedTopics.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Auto-posting is active! 🎉
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  AI will generate and post content{" "}
                  {schedule === "daily"
                    ? "every day"
                    : schedule === "weekly"
                      ? "weekly"
                      : "on custom schedule"}{" "}
                  at {postTime} on {selectedPlatforms.length} platform(s) about{" "}
                  {selectedTopics.length} topic(s).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
