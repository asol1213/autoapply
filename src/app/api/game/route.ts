import { NextRequest, NextResponse } from "next/server";
import { getGameState, recordAction, getLeaderboard } from "@/lib/gamification";
import { getApplications } from "@/lib/store";

export async function GET() {
  try {
    const state = getGameState();
    const leaderboard = getLeaderboard();
    return NextResponse.json({ ...state, leaderboard });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    const apps = getApplications();
    const extraStats = {
      totalLeads: apps.length,
      totalApplied: apps.filter((a) => a.appliedAt).length,
      totalInterviews: apps.filter((a) => ["interview", "offer", "won"].includes(a.stage)).length,
      totalOffers: apps.filter((a) => ["offer", "won"].includes(a.stage)).length,
      totalWon: apps.filter((a) => a.stage === "won").length,
      pipelineCount: new Set(apps.map((a) => a.pipeline)).size,
    };

    const result = recordAction(action, extraStats);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}
