/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  startDate: string;
  endDate: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#0C447C",
    bg: "#E6F1FB",
    icon: "👍",
  },
  instagram: {
    label: "Instagram",
    color: "#72243E",
    bg: "#FBEAF0",
    icon: "📸",
  },
  twitter: {
    label: "Twitter / X",
    color: "#185FA5",
    bg: "#E6F1FB",
    icon: "🐦",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#042C53",
    bg: "#dbeafe",
    icon: "💼",
  },
  telegram: {
    label: "Telegram",
    color: "#0F6E56",
    bg: "#E1F5EE",
    icon: "✈️",
  },
};

const PLATFORM_ACCENT: Record<string, string> = {
  facebook: "#185FA5",
  instagram: "#D4537E",
  twitter: "#378ADD",
  linkedin: "#042C53",
  telegram: "#1D9E75",
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

function totalLikes(post: Post) {
  return (
    post.published_posts?.reduce(
      (s, pp) => s + (pp.engagement_likes || 0),
      0,
    ) ?? 0
  );
}
function totalComments(post: Post) {
  return (
    post.published_posts?.reduce(
      (s, pp) => s + (pp.engagement_comments || 0),
      0,
    ) ?? 0
  );
}
function totalShares(post: Post) {
  return (
    post.published_posts?.reduce(
      (s, pp) => s + (pp.engagement_shares || 0),
      0,
    ) ?? 0
  );
}
function totalSaves(post: Post) {
  return (
    post.published_posts?.reduce(
      (s, pp) => s + (pp.engagement_saves || 0),
      0,
    ) ?? 0
  );
}
function totalReach(post: Post) {
  return post.published_posts?.reduce((s, pp) => s + (pp.reach || 0), 0) ?? 0;
}
function totalEngagement(post: Post) {
  return totalLikes(post) + totalComments(post) + totalShares(post);
}
function engagementRate(post: Post): number {
  const r = totalReach(post);
  return r > 0 ? (totalEngagement(post) / r) * 100 : 0;
}
function ppEngagementRate(pp: PublishedPost): number {
  const eng =
    (pp.engagement_likes || 0) +
    (pp.engagement_comments || 0) +
    (pp.engagement_shares || 0);
  return pp.reach > 0 ? (eng / pp.reach) * 100 : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform] ?? {
    label: platform,
    color: "#444",
    bg: "#f0f0f0",
    icon: "🌐",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 20,
        backgroundColor: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 10 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function StatCell({
  icon,
  value,
  label,
  iconColor,
  bgColor,
}: {
  icon: string;
  value: string;
  label: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 8,
        padding: "7px 4px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, color: iconColor, marginBottom: 2 }}>
        {icon}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--foreground)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--muted-foreground)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ERBar({
  value,
  max = 20,
  showLabel = true,
}: {
  value: number;
  max?: number;
  showLabel?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 5 ? "#1D9E75" : value >= 2 ? "#185FA5" : "#BA7517";

  return (
    <div>
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--muted-foreground)",
            marginBottom: 4,
          }}
        >
          <span>Engagement rate</span>
          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
            {value.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        style={{
          height: 4,
          background: "var(--secondary)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const er = engagementRate(post);
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const isVideo = hasMedia && post.media_urls[0].match(/\.(mp4|webm|ogg)$/i);

  return (
    <article
      onClick={onClick}
      style={{
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--ring)";
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "none";
        el.style.transform = "none";
      }}
    >
      {/* Media thumbnail */}
      <div
        style={{
          height: 160,
          background: "var(--muted)",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {hasMedia ? (
          isVideo ? (
            <video
              src={post.media_urls[0]}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={post.media_urls[0]}
              alt="Post media"
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
              fontSize: 40,
              opacity: 0.18,
            }}
          >
            🖼
          </div>
        )}
        {post.media_urls && post.media_urls.length > 1 && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            +{post.media_urls.length - 1} more
          </span>
        )}
        {/* Platform accent line */}
        {post.published_posts?.[0] && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                PLATFORM_ACCENT[post.published_posts[0].platform] ?? "#888",
              opacity: 0.9,
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: "12px 14px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Platform badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {post.published_posts?.map((pp, i) => (
            <PlatformBadge key={i} platform={pp.platform} />
          ))}
        </div>

        {/* Content */}
        <p
          style={{
            fontSize: 13,
            color: "var(--foreground)",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {post.content || "No content"}
        </p>

        {/* Date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--muted-foreground)",
          }}
        >
          <span>📅</span>
          {format(new Date(post.published_at), "d MMM yyyy")}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 5,
          }}
        >
          <StatCell
            icon="❤️"
            value={fmtNum(totalLikes(post))}
            label="Likes"
            iconColor="#D4537E"
            bgColor="rgba(212,83,126,0.08)"
          />
          <StatCell
            icon="💬"
            value={fmtNum(totalComments(post))}
            label="Comments"
            iconColor="#1D9E75"
            bgColor="rgba(29,158,117,0.08)"
          />
          <StatCell
            icon="↗️"
            value={fmtNum(totalShares(post))}
            label="Shares"
            iconColor="#534AB7"
            bgColor="rgba(83,74,183,0.08)"
          />
          <StatCell
            icon="👁️"
            value={fmtNum(totalReach(post))}
            label="Reach"
            iconColor="#185FA5"
            bgColor="rgba(24,95,165,0.08)"
          />
          <StatCell
            icon="🔖"
            value={fmtNum(totalSaves(post))}
            label="Saves"
            iconColor="#BA7517"
            bgColor="rgba(186,117,23,0.08)"
          />
          <StatCell
            icon="📈"
            value={`${er.toFixed(1)}%`}
            label="ER"
            iconColor="#3B6D11"
            bgColor="rgba(59,109,17,0.08)"
          />
        </div>

        <ERBar value={er} />
      </div>
    </article>
  );
}

function PlatformPerfCard({ pp }: { pp: PublishedPost }) {
  const er = ppEngagementRate(pp);
  const accent = PLATFORM_ACCENT[pp.platform] ?? "#888";

  return (
    <div
      style={{
        border: "0.5px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Accent stripe */}
      <div style={{ height: 3, background: accent }} />

      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border)",
          background: "var(--muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PlatformBadge platform={pp.platform} />
          {pp.platform_post_url && (
            <a
              href={pp.platform_post_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 11,
                color: "#185FA5",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              View post ↗
            </a>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "var(--secondary)",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          Synced {format(new Date(pp.last_synced || pp.published_at), "d MMM")}
        </span>
      </div>

      {/* Engagement metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          padding: "12px 14px",
        }}
      >
        {[
          {
            val: pp.engagement_likes || 0,
            lbl: "Likes",
            color: "#D4537E",
            bg: "rgba(212,83,126,0.07)",
          },
          {
            val: pp.engagement_comments || 0,
            lbl: "Comments",
            color: "#1D9E75",
            bg: "rgba(29,158,117,0.07)",
          },
          {
            val: pp.engagement_shares || 0,
            lbl: "Shares",
            color: "#534AB7",
            bg: "rgba(83,74,183,0.07)",
          },
          {
            val: pp.engagement_saves || 0,
            lbl: "Saves",
            color: "#BA7517",
            bg: "rgba(186,117,23,0.07)",
          },
        ].map(({ val, lbl, color, bg }) => (
          <div
            key={lbl}
            style={{
              textAlign: "center",
              padding: "10px 6px",
              borderRadius: 8,
              background: bg,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color,
                lineHeight: 1,
              }}
            >
              {val.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                marginTop: 3,
              }}
            >
              {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Reach metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${pp.video_views > 0 ? 4 : 3}, 1fr)`,
          gap: 8,
          padding: "0 14px 12px",
        }}
      >
        {[
          { val: pp.reach || 0, lbl: "Reach" },
          { val: pp.impressions || 0, lbl: "Impressions" },
          { val: pp.clicks || 0, lbl: "Clicks" },
          ...(pp.video_views > 0
            ? [{ val: pp.video_views, lbl: "Video views" }]
            : []),
        ].map(({ val, lbl }) => (
          <div
            key={lbl}
            style={{
              background: "var(--muted)",
              borderRadius: 8,
              padding: "8px 6px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--foreground)",
                lineHeight: 1,
              }}
            >
              {val.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                marginTop: 3,
              }}
            >
              {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* ER bar */}
      <div style={{ padding: "0 14px 14px" }}>
        <ERBar value={er} showLabel />
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterOptions;
  onChange: (f: FilterOptions) => void;
  onReset: () => void;
}) {
  const set = (patch: Partial<FilterOptions>) =>
    onChange({ ...filters, ...patch });
  const isDirty =
    filters.search ||
    filters.platform !== "all" ||
    filters.startDate ||
    filters.endDate ||
    filters.status !== "all";

  const inputStyle: React.CSSProperties = {
    height: 34,
    width: "100%",
    fontSize: 13,
    padding: "0 10px",
    borderRadius: 8,
    border: "0.5px solid var(--border)",
    background: "var(--secondary)",
    color: "var(--foreground)",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 12,
          alignItems: "end",
        }}
      >
        {/* Search */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 5,
              letterSpacing: "0.02em",
            }}
          >
            Search
          </div>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                pointerEvents: "none",
                color: "var(--muted-foreground)",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by content..."
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* Platform */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 5,
              letterSpacing: "0.02em",
            }}
          >
            Platform
          </div>
          <select
            value={filters.platform}
            onChange={(e) => set({ platform: e.target.value })}
            style={inputStyle}
          >
            <option value="all">All platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter / X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>

        {/* Start date */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 5,
              letterSpacing: "0.02em",
            }}
          >
            From
          </div>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* End date */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 5,
              letterSpacing: "0.02em",
            }}
          >
            To
          </div>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Status */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              marginBottom: 5,
              letterSpacing: "0.02em",
            }}
          >
            Status
          </div>
          <select
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
            style={inputStyle}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {isDirty && (
        <div
          style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            onClick={onReset}
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 6,
              textDecoration: "underline",
              textUnderlineOffset: 2,
              fontFamily: "inherit",
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterOptions = {
  search: "",
  platform: "all",
  startDate: "",
  endDate: "",
  status: "all",
  sortBy: "published_at",
  sortOrder: "desc",
};

export default function PostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, filters]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/posts?limit=100");
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
        setFilteredPosts(data.posts);
      }
    } catch {
      toast.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const syncAllMetrics = async () => {
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
    if (filters.startDate) {
      result = result.filter(
        (p) => new Date(p.published_at) >= new Date(filters.startDate),
      );
    }
    if (filters.endDate) {
      result = result.filter(
        (p) =>
          new Date(p.published_at) <= new Date(filters.endDate + "T23:59:59Z"),
      );
    }
    if (filters.status !== "all") {
      result = result.filter((p) => p.status === filters.status);
    }

    result.sort((a, b) => {
      let av: number, bv: number;
      switch (filters.sortBy) {
        case "likes":
          av = totalLikes(a);
          bv = totalLikes(b);
          break;
        case "engagement":
          av = totalEngagement(a);
          bv = totalEngagement(b);
          break;
        case "reach":
          av = totalReach(a);
          bv = totalReach(b);
          break;
        default:
          av = new Date(a.published_at).getTime();
          bv = new Date(b.published_at).getTime();
      }
      return filters.sortOrder === "desc" ? bv - av : av - bv;
    });

    setFilteredPosts(result);
  }, [posts, filters]);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 8,
    cursor: "pointer",
    border: "0.5px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontFamily: "inherit",
    transition: "background 0.12s",
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: "#185FA5",
    color: "#E6F1FB",
    border: "none",
  };

  const selectStyle: React.CSSProperties = {
    height: 34,
    fontSize: 13,
    padding: "0 8px",
    borderRadius: 8,
    border: "0.5px solid var(--border)",
    background: "var(--secondary)",
    color: "var(--foreground)",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 10,
          color: "var(--muted-foreground)",
          fontSize: 14,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 20,
            height: 20,
            border: "2px solid var(--border)",
            borderTopColor: "#185FA5",
            borderRadius: "50%",
            animation: "pm-spin 0.7s linear infinite",
          }}
        />
        Loading posts…
        <style>{`@keyframes pm-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        @keyframes pm-spin { to { transform: rotate(360deg); } }
        .pm-card-hover:hover {
          border-color: var(--ring) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            Post Manager
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 3,
            }}
          >
            Manage and analyze all your social media posts
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnBase} onClick={fetchPosts}>
            🔄 Refresh
          </button>
          <button
            style={btnPrimary}
            onClick={syncAllMetrics}
            disabled={syncing}
          >
            {syncing ? (
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "pm-spin 0.7s linear infinite",
                }}
              />
            ) : (
              "☁️"
            )}
            {syncing ? "Syncing…" : "Sync All Metrics"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Results meta + sort */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Showing{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {filteredPosts.length}
          </strong>{" "}
          of {posts.length} posts
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Sort by
          </span>
          <select
            style={{ ...selectStyle, width: 130 }}
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="published_at">Date</option>
            <option value="likes">Likes</option>
            <option value="engagement">Engagement</option>
            <option value="reach">Reach</option>
          </select>
          <button
            style={{
              ...btnBase,
              width: 34,
              height: 34,
              padding: 0,
              justifyContent: "center",
            }}
            onClick={() =>
              setFilters({
                ...filters,
                sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
              })
            }
            title="Toggle sort direction"
          >
            {filters.sortOrder === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {/* Posts grid */}
      {filteredPosts.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 14,
          }}
        >
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => {
                setSelectedPost(post);
                setShowDetail(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "var(--muted-foreground)",
          }}
        >
          <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 12 }}>📊</div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--foreground)",
              marginBottom: 6,
            }}
          >
            No posts found
          </h3>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters</p>
          <button
            style={{ ...btnBase, marginTop: 12, textDecoration: "underline" }}
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Post detail dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent
          style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}
        >
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 16,
                  }}
                >
                  Post details
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: "var(--muted-foreground)",
                      background: "var(--secondary)",
                      padding: "2px 8px",
                      borderRadius: 20,
                    }}
                  >
                    {format(new Date(selectedPost.published_at), "d MMM yyyy")}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Media gallery */}
                {selectedPost.media_urls &&
                  selectedPost.media_urls.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--muted-foreground)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        Media
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(160px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {selectedPost.media_urls.map((url, i) => (
                          <div
                            key={i}
                            style={{
                              borderRadius: 8,
                              overflow: "hidden",
                              background: "var(--muted)",
                            }}
                          >
                            {url.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video
                                src={url}
                                controls
                                style={{
                                  width: "100%",
                                  maxHeight: 120,
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <img
                                src={url}
                                alt={`Media ${i + 1}`}
                                style={{
                                  width: "100%",
                                  height: 120,
                                  objectFit: "cover",
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Content */}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Content
                  </div>
                  <div
                    style={{
                      background: "var(--muted)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      fontSize: 13,
                      color: "var(--foreground)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedPost.content}
                  </div>
                </div>

                {/* Platform performance */}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Platform performance
                  </div>
                  {selectedPost.published_posts?.map((pp, i) => (
                    <PlatformPerfCard key={i} pp={pp} />
                  ))}
                </div>

                {/* Raw debug */}
                {selectedPost.published_posts?.some(
                  (pp) => pp.raw_response,
                ) && (
                  <details style={{ fontSize: 12 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        color: "var(--muted-foreground)",
                        userSelect: "none",
                      }}
                    >
                      Raw API response (debug)
                    </summary>
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 10,
                        background: "var(--muted)",
                        borderRadius: 8,
                        overflow: "auto",
                        maxHeight: 200,
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
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
