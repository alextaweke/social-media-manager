/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    const format = searchParams.get("format") || "csv";

    // Fetch analytics data
    const response = await fetch(
      `${request.nextUrl.origin}/api/analytics?period=${period}`,
    );
    const { data } = await response.json();

    if (format === "csv") {
      // Generate CSV
      let csv = "Date,Platform,Posts,Reach,Engagement,Engagement Rate\n";

      for (const day of data.daily_stats) {
        for (const [platform, stats] of Object.entries(
          data.platform_breakdown,
        )) {
          csv += `${day.date},${platform},${stats},${day.reach},${day.engagement},${data.engagement_rate}\n`;
        }
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=analytics_${period}_${Date.now()}.csv`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
