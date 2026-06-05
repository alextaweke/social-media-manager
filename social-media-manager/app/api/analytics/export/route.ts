/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics-service";

// GET /api/analytics/export
// Streams a CSV file download with analytics summary + per-post breakdown
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";
    const platform = searchParams.get("platform") || "all";

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

    // Fetch summary and posts using the service
    const [summary, posts] = await Promise.all([
      AnalyticsService.getAnalyticsSummary(user.id, days),
      AnalyticsService.getPostsWithEngagement(user.id, 100, platform),
    ]);

    const csv = AnalyticsService.generateCSV(summary, posts || []);

    const filename = `analytics_${period}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Analytics export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
