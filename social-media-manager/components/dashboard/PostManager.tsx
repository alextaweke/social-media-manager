/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Calendar as CalendarIcon,
  Filter,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Bookmark,
  MousePointer,
  Video,
  Image as ImageIcon,
  BarChart3,
  RefreshCw,
  Loader2,
  ExternalLink,
  ThumbsUp,
  Smile,
  Frown,
  TrendingUp,
  Clock,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  platform_post_id: string;
  published_at: string;
  status: string;
  published_posts: PublishedPost[];
}

interface PublishedPost {
  last_synced: any;
  published_at: any;
  id: string;
  platform: string;
  platform_post_id: string;
  platform_post_url: string;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  engagement_saves: number;
  impressions: number;
  reach: number;
  clicks: number;
  video_views: number;
  video_avg_watch_time: number;
  profile_views: number;
  follower_gain: number;
  media_type?: string;
  raw_response?: any;
}

interface FilterOptions {
  search: string;
  platform: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export default function PostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    platform: "all",
    startDate: undefined,
    endDate: undefined,
    sortBy: "published_at",
    sortOrder: "desc",
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [posts, filters]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/posts?limit=100");
      const data = await response.json();
      if (data.success) {
        setPosts(data.posts);
        setFilteredPosts(data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const fetchPostMetrics = async (postId: string) => {
    try {
      const response = await fetch("/api/analytics/fetch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 365, platform: "all" }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.results.synced} posts`);
        fetchPosts();
      }
    } catch (error) {
      toast.error("Failed to sync metrics");
    }
  };

  const applyFilters = () => {
    let filtered = [...posts];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.content.toLowerCase().includes(searchLower) ||
          post.id.toLowerCase().includes(searchLower),
      );
    }

    // Platform filter
    if (filters.platform !== "all") {
      filtered = filtered.filter((post) =>
        post.published_posts?.some((pp) => pp.platform === filters.platform),
      );
    }

    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(
        (post) => new Date(post.published_at) >= filters.startDate!,
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        (post) => new Date(post.published_at) <= filters.endDate!,
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (filters.sortBy) {
        case "published_at":
          aVal = new Date(a.published_at).getTime();
          bVal = new Date(b.published_at).getTime();
          break;
        case "likes":
          aVal =
            a.published_posts?.reduce(
              (sum, pp) => sum + (pp.engagement_likes || 0),
              0,
            ) || 0;
          bVal =
            b.published_posts?.reduce(
              (sum, pp) => sum + (pp.engagement_likes || 0),
              0,
            ) || 0;
          break;
        case "engagement":
          aVal =
            a.published_posts?.reduce(
              (sum, pp) =>
                sum +
                (pp.engagement_likes || 0) +
                (pp.engagement_comments || 0) +
                (pp.engagement_shares || 0),
              0,
            ) || 0;
          bVal =
            b.published_posts?.reduce(
              (sum, pp) =>
                sum +
                (pp.engagement_likes || 0) +
                (pp.engagement_comments || 0) +
                (pp.engagement_shares || 0),
              0,
            ) || 0;
          break;
        case "reach":
          aVal =
            a.published_posts?.reduce((sum, pp) => sum + (pp.reach || 0), 0) ||
            0;
          bVal =
            b.published_posts?.reduce((sum, pp) => sum + (pp.reach || 0), 0) ||
            0;
          break;
        default:
          aVal = new Date(a.published_at).getTime();
          bVal = new Date(b.published_at).getTime();
      }
      return filters.sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    setFilteredPosts(filtered);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      platform: "all",
      startDate: undefined,
      endDate: undefined,
      sortBy: "published_at",
      sortOrder: "desc",
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "👍";
      case "instagram":
        return "📸";
      case "twitter":
        return "🐦";
      case "linkedin":
        return "💼";
      case "telegram":
        return "🤖";
      default:
        return "🌐";
    }
  };

  const getTotalEngagement = (post: Post) => {
    return (
      post.published_posts?.reduce(
        (sum, pp) =>
          sum +
          (pp.engagement_likes || 0) +
          (pp.engagement_comments || 0) +
          (pp.engagement_shares || 0),
        0,
      ) || 0
    );
  };

  const getTotalReach = (post: Post) => {
    return (
      post.published_posts?.reduce((sum, pp) => sum + (pp.reach || 0), 0) || 0
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Post Manager</h2>
          <p className="text-gray-500 text-sm">
            Manage and analyze all your social media posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPosts}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={() => fetchPostMetrics("all")} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1">Sync All Metrics</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by content..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Platform Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Platform</Label>
              <Select
                value={filters.platform}
                onValueChange={(value) =>
                  setFilters({ ...filters, platform: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate
                      ? format(filters.startDate, "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) =>
                      setFilters({ ...filters, startDate: date })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate
                      ? format(filters.endDate, "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) =>
                      setFilters({ ...filters, endDate: date })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters({ ...filters, sortBy: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published_at">Date</SelectItem>
                    <SelectItem value="likes">Likes</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="reach">Reach</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
                    })
                  }
                >
                  {filters.sortOrder === "desc" ? "↓" : "↑"}
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Filters Button */}
          {(filters.search ||
            filters.platform !== "all" ||
            filters.startDate ||
            filters.endDate) && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Showing {filteredPosts.length} of {posts.length} posts
        </p>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPosts.map((post) => {
          const totalEngagement = getTotalEngagement(post);
          const totalReach = getTotalReach(post);
          const engagementRate =
            totalReach > 0
              ? ((totalEngagement / totalReach) * 100).toFixed(1)
              : "0";

          return (
            <Card
              key={post.id}
              className="hover:shadow-lg transition cursor-pointer overflow-hidden"
              onClick={() => {
                setSelectedPost(post);
                setShowPostDetail(true);
              }}
            >
              {/* Media Preview */}
              {post.media_urls && post.media_urls.length > 0 && (
                <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                  {post.media_urls[0].match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={post.media_urls[0]}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={post.media_urls[0]}
                      alt="Post media"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {post.media_urls.length > 1 && (
                    <Badge className="absolute bottom-2 right-2 bg-black/50">
                      +{post.media_urls.length - 1} more
                    </Badge>
                  )}
                </div>
              )}

              <CardContent className="p-4">
                {/* Platforms */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {post.published_posts?.map((pp, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {getPlatformIcon(pp.platform)} {pp.platform}
                    </Badge>
                  ))}
                </div>

                {/* Content Preview */}
                <p className="text-sm line-clamp-2 mb-3">
                  {post.content || "No content"}
                </p>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <CalendarIcon className="h-3 w-3" />
                  {new Date(post.published_at).toLocaleDateString()}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Heart className="h-3 w-3 mx-auto mb-1 text-red-500" />
                    <span className="font-medium">
                      {post.published_posts?.reduce(
                        (sum, pp) => sum + (pp.engagement_likes || 0),
                        0,
                      ) || 0}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <MessageCircle className="h-3 w-3 mx-auto mb-1 text-green-500" />
                    <span className="font-medium">
                      {post.published_posts?.reduce(
                        (sum, pp) => sum + (pp.engagement_comments || 0),
                        0,
                      ) || 0}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Share2 className="h-3 w-3 mx-auto mb-1 text-purple-500" />
                    <span className="font-medium">
                      {post.published_posts?.reduce(
                        (sum, pp) => sum + (pp.engagement_shares || 0),
                        0,
                      ) || 0}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Eye className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                    <span className="font-medium">
                      {totalReach.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Bookmark className="h-3 w-3 mx-auto mb-1 text-yellow-500" />
                    <span className="font-medium">
                      {post.published_posts?.reduce(
                        (sum, pp) => sum + (pp.engagement_saves || 0),
                        0,
                      ) || 0}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <TrendingUp className="h-3 w-3 mx-auto mb-1 text-indigo-500" />
                    <span className="font-medium">{engagementRate}%</span>
                  </div>
                </div>

                {/* Engagement Rate Bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{
                      width: `${Math.min(parseFloat(engagementRate), 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Results */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            No posts found
          </h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
          <Button variant="link" onClick={resetFilters} className="mt-2">
            Clear all filters
          </Button>
        </div>
      )}

      {/* Post Detail Dialog */}
      <Dialog open={showPostDetail} onOpenChange={setShowPostDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Post Details
                  <Badge variant="outline">
                    {new Date(selectedPost.published_at).toLocaleDateString()}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Media Gallery */}
                {selectedPost.media_urls &&
                  selectedPost.media_urls.length > 0 && (
                    <div className="space-y-2">
                      <Label>Media</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedPost.media_urls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-lg overflow-hidden bg-gray-100"
                          >
                            {url.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video
                                src={url}
                                controls
                                className="w-full h-auto max-h-64 object-contain"
                              />
                            ) : (
                              <img
                                src={url}
                                alt={`Media ${idx + 1}`}
                                className="w-full h-auto max-h-64 object-contain"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Content */}
                <div className="space-y-2">
                  <Label>Content</Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="whitespace-pre-wrap">
                      {selectedPost.content}
                    </p>
                  </div>
                </div>

                {/* Platform Performance */}
                <div className="space-y-2">
                  <Label>Platform Performance</Label>
                  <div className="space-y-4">
                    {selectedPost.published_posts?.map((pp, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <div
                          className={`h-1 bg-${getPlatformColor(pp.platform)}`}
                        />
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">
                                {getPlatformIcon(pp.platform)}
                              </span>
                              <div>
                                <h4 className="font-semibold capitalize">
                                  {pp.platform}
                                </h4>
                                {pp.platform_post_url && (
                                  <a
                                    href={pp.platform_post_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View on {pp.platform}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary">
                              Last synced:{" "}
                              {new Date(
                                pp.last_synced || pp.published_at,
                              ).toLocaleDateString()}
                            </Badge>
                          </div>

                          {/* Engagement Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                              <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
                              <p className="text-2xl font-bold">
                                {pp.engagement_likes?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Likes</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <MessageCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                              <p className="text-2xl font-bold">
                                {pp.engagement_comments?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Comments</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                              <Share2 className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                              <p className="text-2xl font-bold">
                                {pp.engagement_shares?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Shares</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                              <Bookmark className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                              <p className="text-2xl font-bold">
                                {pp.engagement_saves?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Saves</p>
                            </div>
                          </div>

                          {/* Reach Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <Eye className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                              <p className="text-xl font-bold">
                                {pp.reach?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Reach</p>
                            </div>
                            <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                              <p className="text-xl font-bold">
                                {pp.impressions?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">
                                Impressions
                              </p>
                            </div>
                            <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                              <MousePointer className="h-5 w-5 text-cyan-500 mx-auto mb-1" />
                              <p className="text-xl font-bold">
                                {pp.clicks?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-gray-500">Clicks</p>
                            </div>
                            {pp.video_views > 0 && (
                              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                <Video className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                                <p className="text-xl font-bold">
                                  {pp.video_views?.toLocaleString() || 0}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Video Views
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Engagement Rate */}
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Engagement Rate</span>
                              <span className="font-medium">
                                {(
                                  (((pp.engagement_likes || 0) +
                                    (pp.engagement_comments || 0) +
                                    (pp.engagement_shares || 0)) /
                                    (pp.reach || 1)) *
                                  100
                                ).toFixed(2)}
                                %
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                                style={{
                                  width: `${Math.min(
                                    (((pp.engagement_likes || 0) +
                                      (pp.engagement_comments || 0) +
                                      (pp.engagement_shares || 0)) /
                                      (pp.reach || 1)) *
                                      100,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Raw Response (Debug) */}
                {selectedPost.published_posts?.some(
                  (pp) => pp.raw_response,
                ) && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Raw API Response (Debug)
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-64">
                      {JSON.stringify(
                        selectedPost.published_posts[0]?.raw_response,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case "facebook":
      return "blue-600";
    case "instagram":
      return "pink-500";
    case "twitter":
      return "blue-400";
    case "linkedin":
      return "blue-700";
    case "telegram":
      return "blue-500";
    default:
      return "gray-500";
  }
}
