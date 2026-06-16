/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Bookmark,
  MousePointer,
  Calendar,
  Clock,
  User,
  ThumbsUp,
  Smile,
  Frown,
  MoreHorizontal,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  Grid,
  List,
  LayoutGrid,
  TrendingUp,
  Award,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  message: string;
  from: {
    name: string;
    id: string;
  };
  created_time: string;
  like_count?: number;
}

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
  last_synced: string;
  published_at: string;
  raw_response?: {
    postData?: {
      comments?: {
        data?: Comment[];
        summary?: { total_count: number };
      };
      reactions?: {
        summary?: { total_count: number };
      };
      shares?: { count: number };
      permalink_url?: string;
    };
  };
}

interface FilterOptions {
  search: string;
  platform: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  dateRange: "all" | "today" | "week" | "month" | "year";
}

type ViewMode = "grid" | "list" | "compact";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string; accent: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    bg: "#E7F3FF",
    icon: "📘",
    accent: "#1877F2",
  },
  instagram: {
    label: "Instagram",
    color: "#E4405F",
    bg: "#FDE8EF",
    icon: "📷",
    accent: "#E4405F",
  },
  twitter: {
    label: "Twitter / X",
    color: "#000000",
    bg: "#F5F5F5",
    icon: "🐦",
    accent: "#1DA1F2",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bg: "#E8F0FE",
    icon: "🔗",
    accent: "#0A66C2",
  },
  telegram: {
    label: "Telegram",
    color: "#26A5E4",
    bg: "#E6F7FF",
    icon: "✈️",
    accent: "#26A5E4",
  },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

const Utils = {
  formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
    return n.toString();
  },

  sumField(post: Post, key: keyof PublishedPost): number {
    return (
      post.published_posts?.reduce(
        (s, pp) => s + ((pp[key] as number) || 0),
        0,
      ) ?? 0
    );
  },

  totalEngagement(post: Post): number {
    return (
      this.sumField(post, "engagement_likes") +
      this.sumField(post, "engagement_comments") +
      this.sumField(post, "engagement_shares")
    );
  },

  totalReach(post: Post): number {
    return this.sumField(post, "reach");
  },

  engagementRate(post: Post): number {
    const reach = this.totalReach(post);
    return reach > 0 ? (this.totalEngagement(post) / reach) * 100 : 0;
  },

  getComments(post: Post): Comment[] {
    const pp = post.published_posts?.[0];
    if (pp?.raw_response?.postData?.comments?.data) {
      return pp.raw_response.postData.comments.data;
    }
    return [];
  },

  getCommentCount(post: Post): number {
    const pp = post.published_posts?.[0];
    return pp?.raw_response?.postData?.comments?.summary?.total_count || 0;
  },

  getReactionCount(post: Post): number {
    const pp = post.published_posts?.[0];
    return pp?.raw_response?.postData?.reactions?.summary?.total_count || 0;
  },

  getPermalink(post: Post): string {
    const pp = post.published_posts?.[0];
    return (
      pp?.raw_response?.postData?.permalink_url || pp?.platform_post_url || "#"
    );
  },

  truncateText(text: string, maxLength: number = 150): string {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  },

  timeAgo(date: string): string {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return date;
    }
  },
};

// ─── Comment Section Component ──────────────────────────────────────────────

const CommentSection: React.FC<{ comments: Comment[]; totalCount: number }> = ({
  comments,
  totalCount,
}) => {
  const [expanded, setExpanded] = useState(false);
  const displayComments = expanded ? comments : comments.slice(0, 3);

  if (!comments || comments.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "16px", color: "#888" }}>
        <MessageCircle size={20} style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 13 }}>No comments yet</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          💬 Comments ({totalCount})
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayComments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: "10px 12px",
              background: "var(--secondary)",
              borderRadius: 8,
              border: "0.5px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#378ADD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {comment.from.name?.charAt(0) || "U"}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {comment.from.name || "Unknown User"}
              </span>
              <span style={{ fontSize: 10, color: "#888", marginLeft: "auto" }}>
                {Utils.timeAgo(comment.created_time)}
              </span>
            </div>
            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {comment.message || "No message content"}
            </p>
            {comment.like_count && comment.like_count > 0 && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                ❤️ {comment.like_count}
              </div>
            )}
          </div>
        ))}
      </div>
      {comments.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#378ADD",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {expanded ? "Show less" : `View all ${comments.length} comments`}
        </button>
      )}
    </div>
  );
};

// ─── YouTube-Style Card ──────────────────────────────────────────────────────

const YouTubeCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const thumbnail = hasMedia ? post.media_urls[0] : null;
  const totalViews = Utils.totalReach(post);
  const totalLikes = Utils.sumField(post, "engagement_likes");
  const totalComments = Utils.sumField(post, "engagement_comments");
  const commentCount = Utils.getCommentCount(post);
  const reactionCount = Utils.getReactionCount(post);
  const platform = post.published_posts?.[0]?.platform || "facebook";
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook;
  const date = format(new Date(post.published_at), "MMM d, yyyy");
  const engagementRate = Utils.engagementRate(post);

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: "var(--card)",
        borderRadius: 12,
        overflow: "hidden",
        border: "0.5px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          background: "#0f0f0f",
          aspectRatio: "16/9",
        }}
      >
        {thumbnail ? (
          thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
            <div
              style={{ position: "relative", width: "100%", height: "100%" }}
            >
              <video
                src={thumbnail}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,0,0,0.7)",
                  borderRadius: "50%",
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play size={24} fill="white" color="white" />
              </div>
            </div>
          ) : (
            <img
              src={thumbnail}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              color: "#333",
            }}
          >
            📄
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(0,0,0,0.85)",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            color: "white",
          }}
        >
          {totalViews.toLocaleString()} views
        </div>
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: config.bg,
            color: config.color,
            padding: "2px 10px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {config.icon} {config.label}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
            marginBottom: 8,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.content || "Untitled Post"}
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888" }}>
          <span>❤️ {Utils.formatNumber(totalLikes)}</span>
          <span>💬 {Utils.formatNumber(totalComments)}</span>
          <span style={{ color: engagementRate > 2 ? "#1D9E75" : "#888" }}>
            📊 {engagementRate.toFixed(1)}% ER
          </span>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#666",
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar size={12} />
          {date}
        </div>

        <div
          style={{
            marginTop: 8,
            height: 3,
            background: "var(--border)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min((engagementRate / 20) * 100, 100)}%`,
              background: engagementRate > 2 ? "#1D9E75" : "#FF6B35",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── List Card ──────────────────────────────────────────────────────────────

const ListCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const thumbnail = hasMedia ? post.media_urls[0] : null;
  const totalViews = Utils.totalReach(post);
  const totalEngagement = Utils.totalEngagement(post);
  const commentCount = Utils.getCommentCount(post);
  const platform = post.published_posts?.[0]?.platform || "facebook";
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: 16,
        padding: "12px",
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--secondary)";
        e.currentTarget.style.transform = "translateX(4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--card)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div
        style={{
          width: 160,
          height: 90,
          borderRadius: 8,
          overflow: "hidden",
          background: "#0f0f0f",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: "#333",
            }}
          >
            📄
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            background: "rgba(0,0,0,0.8)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            color: "white",
          }}
        >
          {totalViews.toLocaleString()}
        </div>
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            background: config.bg,
            color: config.color,
            padding: "1px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {config.icon} {config.label}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 4,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.content || "Untitled Post"}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888" }}>
          <span>
            ❤️ {Utils.formatNumber(Utils.sumField(post, "engagement_likes"))}
          </span>
          <span>
            💬 {Utils.formatNumber(Utils.sumField(post, "engagement_comments"))}
          </span>
          <span>
            🔄 {Utils.formatNumber(Utils.sumField(post, "engagement_shares"))}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
          {Utils.timeAgo(post.published_at)} • {commentCount} comments
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
          color: "#888",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#D4537E" }}>❤️</div>
          <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
            {Utils.formatNumber(Utils.sumField(post, "engagement_likes"))}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#1D9E75" }}>💬</div>
          <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
            {Utils.formatNumber(Utils.sumField(post, "engagement_comments"))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compact Card ──────────────────────────────────────────────────────────

const CompactCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const totalViews = Utils.totalReach(post);
  const engagementRate = Utils.engagementRate(post);
  const platform = post.published_posts?.[0]?.platform || "facebook";
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--card)";
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          overflow: "hidden",
          background: "#0f0f0f",
          flexShrink: 0,
        }}
      >
        {post.media_urls?.[0] ? (
          <img
            src={post.media_urls[0]}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "#333",
            }}
          >
            📄
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {post.content || "Untitled Post"}
        </div>
        <div style={{ fontSize: 10, color: "#888" }}>
          {config.icon} {totalViews.toLocaleString()} views •{" "}
          {engagementRate.toFixed(1)}% ER
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#666" }}>
        {format(new Date(post.published_at), "MMM d")}
      </div>
    </div>
  );
};

// ─── Video Player Modal with Comments ──────────────────────────────────────

const VideoPlayer: React.FC<{
  post: Post | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}> = ({ post, onClose, onNext, onPrevious, hasNext, hasPrevious }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!post) return null;

  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const isVideo = post.media_urls?.some((url) =>
    url.match(/\.(mp4|webm|ogg|mov|avi)$/i),
  );
  const mediaUrl = hasMedia ? post.media_urls[0] : null;
  const totalEngagement = Utils.totalEngagement(post);
  const totalReach = Utils.totalReach(post);
  const engagementRate = Utils.engagementRate(post);
  const comments = Utils.getComments(post);
  const commentCount = Utils.getCommentCount(post);
  const reactionCount = Utils.getReactionCount(post);
  const permalink = Utils.getPermalink(post);
  const platform = post.published_posts?.[0]?.platform || "facebook";
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.95)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.3s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div
        style={{
          width: "95vw",
          maxWidth: 1400,
          height: "90vh",
          background: "#0f0f0f",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(20,20,20,0.95)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #2a2a2a",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              style={{
                background: "#2a2a2a",
                border: "none",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: hasPrevious ? "pointer" : "not-allowed",
                opacity: hasPrevious ? 1 : 0.3,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              style={{
                background: "#2a2a2a",
                border: "none",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: hasNext ? "pointer" : "not-allowed",
                opacity: hasNext ? 1 : 0.3,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: config.color }}>
              {config.icon} {config.label}
            </span>
            <button
              onClick={() => setShowComments(!showComments)}
              style={{
                background: showComments ? "#378ADD" : "#2a2a2a",
                border: "none",
                color: "white",
                padding: "4px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MessageCircle size={14} />
              {commentCount}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#2a2a2a",
                border: "none",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Video/Media Area */}
          <div
            style={{
              flex: showComments ? 2 : 3,
              background: "#000",
              position: "relative",
            }}
          >
            {mediaUrl ? (
              isVideo ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onClick={togglePlay}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      setProgress((video.currentTime / video.duration) * 100);
                    }}
                  />
                  {/* Video Controls Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "20px",
                      background:
                        "linear-gradient(transparent, rgba(0,0,0,0.7))",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <button
                      onClick={togglePlay}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          background: "#378ADD",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <button
                      onClick={toggleMute}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              )
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 64,
                  color: "#333",
                }}
              >
                📄 No Media
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div
            style={{
              flex: 1,
              background: "#1a1a1a",
              overflowY: "auto",
              padding: "20px",
              borderLeft: "1px solid #2a2a2a",
              display: showComments ? "block" : "none",
            }}
          >
            <h3
              style={{
                color: "white",
                fontSize: 18,
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              {post.content || "Untitled Post"}
            </h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              {post.published_posts?.map((pp, i) => (
                <span
                  key={i}
                  style={{
                    padding: "4px 8px",
                    background: "#2a2a2a",
                    borderRadius: 4,
                    fontSize: 11,
                    color: PLATFORM_CONFIG[pp.platform]?.accent || "#888",
                  }}
                >
                  {PLATFORM_CONFIG[pp.platform]?.icon} {pp.platform}
                </span>
              ))}
              {permalink && permalink !== "#" && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "4px 8px",
                    background: "#2a2a2a",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "#378ADD",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ExternalLink size={12} /> View
                </a>
              )}
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                {
                  icon: "❤️",
                  label: "Likes",
                  value: Utils.formatNumber(
                    Utils.sumField(post, "engagement_likes"),
                  ),
                  color: "#D4537E",
                },
                {
                  icon: "💬",
                  label: "Comments",
                  value: Utils.formatNumber(
                    Utils.sumField(post, "engagement_comments"),
                  ),
                  color: "#1D9E75",
                },
                {
                  icon: "🔄",
                  label: "Shares",
                  value: Utils.formatNumber(
                    Utils.sumField(post, "engagement_shares"),
                  ),
                  color: "#534AB7",
                },
                {
                  icon: "👁️",
                  label: "Reach",
                  value: Utils.formatNumber(totalReach),
                  color: "#378ADD",
                },
                {
                  icon: "📊",
                  label: "Engagement Rate",
                  value: `${engagementRate.toFixed(2)}%`,
                  color: "#FF6B35",
                },
                {
                  icon: "❤️",
                  label: "Reactions",
                  value: Utils.formatNumber(reactionCount),
                  color: "#FF6B35",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#2a2a2a",
                    padding: "10px",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>
                    {item.icon}
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#888" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Engagement Rate Bar */}
            <div
              style={{
                background: "#2a2a2a",
                padding: "12px",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, color: "#888" }}>
                  Engagement Rate
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#378ADD" }}
                >
                  {engagementRate.toFixed(2)}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "#3a3a3a",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min((engagementRate / 20) * 100, 100)}%`,
                    background: engagementRate > 2 ? "#1D9E75" : "#FF6B35",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>

            {/* Comments Section */}
            <CommentSection comments={comments} totalCount={commentCount} />

            <div
              style={{
                fontSize: 10,
                color: "#444",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Published {format(new Date(post.published_at), "MMMM d, yyyy")} •{" "}
              {Utils.timeAgo(post.published_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Filter Bar ──────────────────────────────────────────────────────────────

const FilterBar: React.FC<{
  filters: FilterOptions;
  viewMode: ViewMode;
  onFilterChange: (patch: Partial<FilterOptions>) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalPosts: number;
  filteredCount: number;
  onSync: () => void;
  isSyncing: boolean;
}> = ({
  filters,
  viewMode,
  onFilterChange,
  onViewModeChange,
  totalPosts,
  filteredCount,
  onSync,
  isSyncing,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid var(--border)",
        marginBottom: 16,
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--muted-foreground)",
          }}
        />
        <input
          type="text"
          placeholder="Search posts..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          style={{
            height: 36,
            fontSize: 13,
            borderRadius: 8,
            border: "0.5px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            padding: "0 10px 0 34px",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      <select
        value={filters.platform}
        onChange={(e) => onFilterChange({ platform: e.target.value })}
        style={{
          height: 36,
          fontSize: 13,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--secondary)",
          color: "var(--foreground)",
          padding: "0 10px",
          cursor: "pointer",
          minWidth: 130,
        }}
      >
        <option value="all">🌐 All Platforms</option>
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>

      <select
        value={filters.sortBy}
        onChange={(e) => onFilterChange({ sortBy: e.target.value })}
        style={{
          height: 36,
          fontSize: 13,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--secondary)",
          color: "var(--foreground)",
          padding: "0 10px",
          cursor: "pointer",
          minWidth: 120,
        }}
      >
        <option value="published_at">📅 Date</option>
        <option value="likes">❤️ Likes</option>
        <option value="engagement">📊 Engagement</option>
        <option value="reach">👁️ Reach</option>
      </select>

      <select
        value={filters.dateRange}
        onChange={(e) => onFilterChange({ dateRange: e.target.value as any })}
        style={{
          height: 36,
          fontSize: 13,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--secondary)",
          color: "var(--foreground)",
          padding: "0 10px",
          cursor: "pointer",
          minWidth: 100,
        }}
      >
        <option value="all">📅 All Time</option>
        <option value="today">📆 Today</option>
        <option value="week">📊 This Week</option>
        <option value="month">📈 This Month</option>
        <option value="year">📉 This Year</option>
      </select>

      <button
        onClick={() =>
          onFilterChange({
            sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
          })
        }
        style={{
          height: 36,
          width: 36,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--secondary)",
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {filters.sortOrder === "desc" ? "↓" : "↑"}
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={onSync}
        disabled={isSyncing}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 8,
          cursor: isSyncing ? "not-allowed" : "pointer",
          background: isSyncing ? "#2a2a2a" : "#378ADD",
          color: "white",
          border: "none",
        }}
      >
        {isSyncing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {isSyncing ? "Syncing..." : "Sync Metrics"}
      </button>

      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--secondary)",
          padding: 4,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
        }}
      >
        {[
          { mode: "grid", icon: <Grid size={16} />, label: "Grid" },
          { mode: "list", icon: <List size={16} />, label: "List" },
          { mode: "compact", icon: <LayoutGrid size={16} />, label: "Compact" },
        ].map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode as ViewMode)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: viewMode === mode ? "var(--card)" : "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--foreground)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
            }}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--muted-foreground)",
          padding: "0 8px",
          background: "var(--secondary)",
          borderRadius: 6,
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <strong style={{ color: "var(--foreground)" }}>{filteredCount}</strong>/{" "}
        {totalPosts}
      </div>
    </div>
  );
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────

const LoadingSpinner: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 400,
      gap: 16,
      flexDirection: "column",
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        border: "3px solid var(--border)",
        borderTopColor: "#378ADD",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
    <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
      Loading your content...
    </span>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterOptions = {
  search: "",
  platform: "all",
  sortBy: "published_at",
  sortOrder: "desc",
  dateRange: "all",
};

export default function PostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [posts, filters]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/posts?limit=100");
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch {
      toast.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/analytics/fetch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack: 365, platform: "all" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.results.synced} posts`);
        fetchPosts();
      }
    } catch {
      toast.error("Failed to sync metrics");
    } finally {
      setSyncing(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...posts];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      );
    }

    // Platform
    if (filters.platform !== "all") {
      result = result.filter((p) =>
        p.published_posts?.some((pp) => pp.platform === filters.platform),
      );
    }

    // Date Range
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();
      switch (filters.dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      result = result.filter((p) => new Date(p.published_at) >= startDate);
    }

    // Sort
    result.sort((a, b) => {
      let av: number, bv: number;
      switch (filters.sortBy) {
        case "likes":
          av = Utils.sumField(a, "engagement_likes");
          bv = Utils.sumField(b, "engagement_likes");
          break;
        case "engagement":
          av = Utils.totalEngagement(a);
          bv = Utils.totalEngagement(b);
          break;
        case "reach":
          av = Utils.totalReach(a);
          bv = Utils.totalReach(b);
          break;
        default:
          av = new Date(a.published_at).getTime();
          bv = new Date(b.published_at).getTime();
      }
      return filters.sortOrder === "desc" ? bv - av : av - bv;
    });

    setFiltered(result);
  }, [posts, filters]);

  const updateFilters = (patch: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleClosePlayer = () => {
    setSelectedPost(null);
  };

  const handleNext = () => {
    if (!selectedPost) return;
    const currentIndex = filtered.findIndex((p) => p.id === selectedPost.id);
    if (currentIndex < filtered.length - 1) {
      setSelectedPost(filtered[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!selectedPost) return;
    const currentIndex = filtered.findIndex((p) => p.id === selectedPost.id);
    if (currentIndex > 0) {
      setSelectedPost(filtered[currentIndex - 1]);
    }
  };

  const getCurrentIndex = () => {
    if (!selectedPost) return -1;
    return filtered.findIndex((p) => p.id === selectedPost.id);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg, #378ADD, #8B5CF6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🎬 Content Studio
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            Track engagement and comments across all platforms
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={fetchPosts}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              cursor: "pointer",
              border: "0.5px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          padding: "12px 0",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          📊{" "}
          <strong style={{ color: "var(--foreground)" }}>{posts.length}</strong>{" "}
          total posts
        </div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          ❤️{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {Utils.formatNumber(
              posts.reduce(
                (sum, p) => sum + Utils.sumField(p, "engagement_likes"),
                0,
              ),
            )}
          </strong>{" "}
          total likes
        </div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          💬{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {Utils.formatNumber(
              posts.reduce(
                (sum, p) => sum + Utils.sumField(p, "engagement_comments"),
                0,
              ),
            )}
          </strong>{" "}
          total comments
        </div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          👁️{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {Utils.formatNumber(
              posts.reduce((sum, p) => sum + Utils.totalReach(p), 0),
            )}
          </strong>{" "}
          total reach
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        viewMode={viewMode}
        onFilterChange={updateFilters}
        onViewModeChange={setViewMode}
        totalPosts={posts.length}
        filteredCount={filtered.length}
        onSync={syncAll}
        isSyncing={syncing}
      />

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "var(--card)",
            borderRadius: 12,
            border: "0.5px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>📭</div>
          <p
            style={{
              fontSize: 16,
              color: "var(--foreground)",
              marginBottom: 8,
            }}
          >
            No content found
          </p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Try adjusting your search or filters
          </p>
          {(filters.search ||
            filters.platform !== "all" ||
            filters.dateRange !== "all") && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                borderRadius: 6,
                border: "0.5px solid var(--border)",
                background: "var(--background)",
                cursor: "pointer",
                marginTop: 12,
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: viewMode === "grid" ? "grid" : "flex",
            gridTemplateColumns:
              viewMode === "grid"
                ? "repeat(auto-fill, minmax(300px, 1fr))"
                : undefined,
            flexDirection:
              viewMode === "list" || viewMode === "compact"
                ? "column"
                : undefined,
            gap: viewMode === "grid" ? 16 : 10,
          }}
        >
          {filtered.map((post) => {
            if (viewMode === "grid") {
              return (
                <YouTubeCard
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              );
            } else if (viewMode === "list") {
              return (
                <ListCard
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              );
            } else {
              return (
                <CompactCard
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              );
            }
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedPost && (
        <VideoPlayer
          post={selectedPost}
          onClose={handleClosePlayer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={getCurrentIndex() < filtered.length - 1}
          hasPrevious={getCurrentIndex() > 0}
        />
      )}
    </div>
  );
}
