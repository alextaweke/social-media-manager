/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  sortBy: string;
  sortOrder: "asc" | "desc";
}

type ViewMode = "grid" | "list" | "compact";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  facebook: { label: "Facebook", color: "#0C447C", bg: "#E6F1FB", icon: "📘" },
  instagram: {
    label: "Instagram",
    color: "#72243E",
    bg: "#FBEAF0",
    icon: "📷",
  },
  twitter: {
    label: "Twitter / X",
    color: "#185FA5",
    bg: "#E6F1FB",
    icon: "🐦",
  },
  linkedin: { label: "LinkedIn", color: "#042C53", bg: "#dbeafe", icon: "🔗" },
  telegram: { label: "Telegram", color: "#0F6E56", bg: "#E1F5EE", icon: "✈️" },
};

const PLATFORM_ACCENT: Record<string, string> = {
  facebook: "#185FA5",
  instagram: "#D4537E",
  twitter: "#378ADD",
  linkedin: "#042C53",
  telegram: "#1D9E75",
};

// ─── Utils Module ─────────────────────────────────────────────────────────────

const MetricsUtils = {
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

  postEngagementRate(post: Post): number {
    const reach = this.totalReach(post);
    return reach > 0 ? (this.totalEngagement(post) / reach) * 100 : 0;
  },
};

// ─── YouTube-Style Video Player Component ─────────────────────────────────────

const VideoPlayer: React.FC<{
  post: Post | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}> = ({ post, onClose, onNext, onPrevious, hasNext, hasPrevious }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!post) return null;

  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const isVideo = post.media_urls?.some((url) =>
    url.match(/\.(mp4|webm|ogg|mov|avi)$/i),
  );
  const mediaUrl = hasMedia ? post.media_urls[0] : null;
  const totalEngagement = MetricsUtils.totalEngagement(post);
  const totalReach = MetricsUtils.totalReach(post);
  const engagementRate = MetricsUtils.postEngagementRate(post);

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
      `}</style>

      <div
        style={{
          width: "90vw",
          maxWidth: 1200,
          height: "80vh",
          background: "#0f0f0f",
          borderRadius: 12,
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
            background: "#1a1a1a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #2a2a2a",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              style={{
                background: "#2a2a2a",
                border: "none",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: hasPrevious ? "pointer" : "not-allowed",
                opacity: hasPrevious ? 1 : 0.5,
                fontSize: 18,
              }}
            >
              ←
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
                borderRadius: 6,
                cursor: hasNext ? "pointer" : "not-allowed",
                opacity: hasNext ? 1 : 0.5,
                fontSize: 18,
              }}
            >
              →
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#2a2a2a",
              border: "none",
              color: "white",
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Video/Media Area */}
          <div style={{ flex: 2, background: "#000", position: "relative" }}>
            {mediaUrl ? (
              isVideo ? (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  controls
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    setProgress((video.currentTime / video.duration) * 100);
                  }}
                />
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
                🖼️ No Media
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
                    color: PLATFORM_ACCENT[pp.platform],
                  }}
                >
                  {PLATFORM_CONFIG[pp.platform]?.icon} {pp.platform}
                </span>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: "#2a2a2a",
                  padding: "12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>❤️</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#D4537E" }}
                >
                  {MetricsUtils.formatNumber(
                    MetricsUtils.sumField(post, "engagement_likes"),
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Likes</div>
              </div>
              <div
                style={{
                  background: "#2a2a2a",
                  padding: "12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>💬</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}
                >
                  {MetricsUtils.formatNumber(
                    MetricsUtils.sumField(post, "engagement_comments"),
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Comments</div>
              </div>
              <div
                style={{
                  background: "#2a2a2a",
                  padding: "12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>🔄</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#534AB7" }}
                >
                  {MetricsUtils.formatNumber(
                    MetricsUtils.sumField(post, "engagement_shares"),
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Shares</div>
              </div>
              <div
                style={{
                  background: "#2a2a2a",
                  padding: "12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>👁️</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#378ADD" }}
                >
                  {MetricsUtils.formatNumber(totalReach)}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Reach</div>
              </div>
            </div>

            <div
              style={{
                background: "#2a2a2a",
                padding: "12px",
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, color: "#888" }}>
                  Engagement Rate
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 600, color: "#378ADD" }}
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
                    background: "#378ADD",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#666", textAlign: "center" }}>
              Published {format(new Date(post.published_at), "MMMM d, yyyy")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── YouTube-Style Card Component ────────────────────────────────────────────

const YouTubeCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const thumbnail = hasMedia ? post.media_urls[0] : null;
  const totalViews = MetricsUtils.totalReach(post);
  const totalLikes = MetricsUtils.sumField(post, "engagement_likes");
  const totalComments = MetricsUtils.sumField(post, "engagement_comments");
  const date = format(new Date(post.published_at), "MMM d, yyyy");

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: "#1a1a1a",
          aspectRatio: "16/9",
          marginBottom: 8,
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
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
            🖼️
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(0,0,0,0.8)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 11,
            color: "white",
          }}
        >
          {totalViews.toLocaleString()} views
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${PLATFORM_ACCENT[post.published_posts?.[0]?.platform] || "#378ADD"}, ${
              PLATFORM_ACCENT[post.published_posts?.[0]?.platform] || "#378ADD"
            }88)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {PLATFORM_CONFIG[post.published_posts?.[0]?.platform]?.icon || "📱"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--foreground)",
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
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
            {totalLikes.toLocaleString()} likes •{" "}
            {totalComments.toLocaleString()} comments
          </div>
          <div style={{ fontSize: 11, color: "#666" }}>{date}</div>
        </div>
      </div>
    </div>
  );
};

// ─── List View Card Component ────────────────────────────────────────────────

const ListCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const thumbnail = hasMedia ? post.media_urls[0] : null;
  const totalViews = MetricsUtils.totalReach(post);
  const totalEngagement = MetricsUtils.totalEngagement(post);

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
        (e.currentTarget as HTMLDivElement).style.background =
          "var(--secondary)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--card)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
      }}
    >
      <div
        style={{
          width: 160,
          height: 90,
          borderRadius: 8,
          overflow: "hidden",
          background: "#1a1a1a",
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
            🖼️
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            background: "rgba(0,0,0,0.8)",
            padding: "2px 4px",
            borderRadius: 4,
            fontSize: 10,
            color: "white",
          }}
        >
          {totalViews.toLocaleString()}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--foreground)",
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {post.content || "Untitled Post"}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
          {post.published_posts?.slice(0, 3).map((pp, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: PLATFORM_ACCENT[pp.platform],
              }}
            >
              {PLATFORM_CONFIG[pp.platform]?.icon} {pp.platform}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#888" }}>
          {totalEngagement.toLocaleString()} engagements •{" "}
          {format(new Date(post.published_at), "MMM d, yyyy")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#D4537E" }}>❤️</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {MetricsUtils.formatNumber(
              MetricsUtils.sumField(post, "engagement_likes"),
            )}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#1D9E75" }}>💬</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {MetricsUtils.formatNumber(
              MetricsUtils.sumField(post, "engagement_comments"),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compact Card Component ──────────────────────────────────────────────────

const CompactCard: React.FC<{
  post: Post;
  onClick: () => void;
}> = ({ post, onClick }) => {
  const totalViews = MetricsUtils.totalReach(post);
  const engagementRate = MetricsUtils.postEngagementRate(post);

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
        (e.currentTarget as HTMLDivElement).style.background =
          "var(--secondary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--card)";
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          overflow: "hidden",
          background: "#1a1a1a",
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
            🖼️
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--foreground)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {post.content || "Untitled Post"}
        </div>
        <div style={{ fontSize: 10, color: "#888" }}>
          {totalViews.toLocaleString()} views • {engagementRate.toFixed(1)}% ER
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#666" }}>
        {format(new Date(post.published_at), "MMM d")}
      </div>
    </div>
  );
};

// ─── Filter Bar Module ───────────────────────────────────────────────────────

const FilterBar: React.FC<{
  filters: FilterOptions;
  viewMode: ViewMode;
  onFilterChange: (patch: Partial<FilterOptions>) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalPosts: number;
  filteredCount: number;
}> = ({
  filters,
  viewMode,
  onFilterChange,
  onViewModeChange,
  totalPosts,
  filteredCount,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "12px 0",
      }}
    >
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: "var(--muted-foreground)",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Search posts..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          style={{
            height: 36,
            fontSize: 13,
            fontFamily: "inherit",
            borderRadius: 8,
            border: "0.5px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            padding: "0 10px 0 32px",
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

      <button
        style={{
          height: 36,
          width: 36,
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--secondary)",
          cursor: "pointer",
          fontSize: 16,
        }}
        onClick={() =>
          onFilterChange({
            sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
          })
        }
      >
        {filters.sortOrder === "desc" ? "↓" : "↑"}
      </button>

      <div style={{ flex: 1 }} />

      {/* View Mode Toggle */}
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
          { mode: "grid", icon: "⊞", label: "Grid" },
          { mode: "list", icon: "☰", label: "List" },
          { mode: "compact", icon: "≡", label: "Compact" },
        ].map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode as ViewMode)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: viewMode === mode ? "var(--card)" : "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--foreground)",
              transition: "all 0.2s ease",
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
        }}
      >
        <strong style={{ color: "var(--foreground)", marginRight: 4 }}>
          {filteredCount}
        </strong>
        of {totalPosts}
      </div>
    </div>
  );
};

// ─── Loading Spinner ─────────────────────────────────────────────────────────

const LoadingSpinner: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 400,
      gap: 12,
      flexDirection: "column",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: "3px solid var(--border)",
        borderTopColor: "#378ADD",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
    <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
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
};

export default function PostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

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
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((p) => p.content?.toLowerCase().includes(q));
    }
    if (filters.platform !== "all") {
      result = result.filter((p) =>
        p.published_posts?.some((pp) => pp.platform === filters.platform),
      );
    }
    result.sort((a, b) => {
      let av: number, bv: number;
      switch (filters.sortBy) {
        case "likes":
          av = MetricsUtils.sumField(a, "engagement_likes");
          bv = MetricsUtils.sumField(b, "engagement_likes");
          break;
        case "engagement":
          av = MetricsUtils.totalEngagement(a);
          bv = MetricsUtils.totalEngagement(b);
          break;
        case "reach":
          av = MetricsUtils.totalReach(a);
          bv = MetricsUtils.totalReach(b);
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
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "var(--foreground)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🎬</span> Content Studio
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            Track engagement and performance across all platforms
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
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
            onClick={fetchPosts}
          >
            🔄 Refresh
          </button>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              cursor: "pointer",
              background: "#378ADD",
              color: "white",
              border: "none",
            }}
            onClick={syncAll}
            disabled={syncing}
          >
            {syncing ? "⏳ Syncing..." : "☁️ Sync Metrics"}
          </button>
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
              fontSize: 14,
              color: "var(--foreground)",
              marginBottom: 8,
            }}
          >
            No content found
          </p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Try adjusting your filters
          </p>
          {(filters.search || filters.platform !== "all") && (
            <button
              style={{
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 6,
                border: "0.5px solid var(--border)",
                background: "var(--background)",
                cursor: "pointer",
                marginTop: 12,
              }}
              onClick={() => setFilters(DEFAULT_FILTERS)}
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
                ? "repeat(auto-fill, minmax(320px, 1fr))"
                : undefined,
            flexDirection:
              viewMode === "list" || viewMode === "compact"
                ? "column"
                : undefined,
            gap: viewMode === "grid" ? 20 : 12,
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
