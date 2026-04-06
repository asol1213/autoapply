import { NextRequest, NextResponse } from "next/server";
import { getApplications, getApplication, saveApplication, deleteApplication, bulkUpdateStage } from "@/lib/store";
import type { Application, Stage } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const app = getApplication(id);
      return app ? NextResponse.json(app) : NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const apps = getApplications();
    const pipeline = req.nextUrl.searchParams.get("pipeline");
    const search = req.nextUrl.searchParams.get("search")?.toLowerCase();
    const tag = req.nextUrl.searchParams.get("tag");
    const stage = req.nextUrl.searchParams.get("stage");

    let filtered = apps;
    if (pipeline && pipeline !== "all") filtered = filtered.filter((a) => a.pipeline === pipeline);
    if (stage) filtered = filtered.filter((a) => a.stage === stage);
    if (tag) filtered = filtered.filter((a) => a.tags.includes(tag));
    if (search) {
      filtered = filtered.filter((a) =>
        a.company.toLowerCase().includes(search) ||
        a.role.toLowerCase().includes(search) ||
        (a.contact?.name || "").toLowerCase().includes(search) ||
        (a.notes || "").toLowerCase().includes(search) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(search)) ||
        (a.skills || []).some((s) => s.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(filtered);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk update
    if (body.bulkAction === "updateStage" && Array.isArray(body.ids)) {
      bulkUpdateStage(body.ids, body.stage as Stage);
      return NextResponse.json({ ok: true, updated: body.ids.length });
    }

    if (!body.company?.trim()) {
      return NextResponse.json({ error: "company required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const app: Application = {
      id: crypto.randomUUID(),
      pipeline: body.pipeline || "remote",
      stage: body.stage || "lead",
      company: body.company.trim(),
      role: (body.role || "").trim(),
      url: body.url || "",
      language: body.language || "en",
      jobDescription: body.jobDescription || "",
      coverLetter: body.coverLetter || "",
      cvData: body.cvData || "",
      emailSubject: body.emailSubject || "",
      emailBody: body.emailBody || "",
      contact: {
        name: body.contact?.name || "",
        role: body.contact?.role || "",
        email: body.contact?.email || "",
        linkedin: body.contact?.linkedin || "",
        phone: body.contact?.phone || "",
      },
      notes: body.notes || "",
      nextAction: body.nextAction || "",
      nextActionDate: body.nextActionDate || null,
      skills: Array.isArray(body.skills) ? body.skills : [],
      salary: body.salary || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      activities: [{
        date: now,
        type: "note",
        text: `Erstellt in Pipeline "${body.pipeline || "remote"}"`,
      }],
      createdAt: now,
      updatedAt: now,
      appliedAt: body.stage === "applied" ? now : null,
      followUpAt: null,
      followUpDone: false,
    };
    saveApplication(app);
    return NextResponse.json(app);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const existing = getApplication(body.id);
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Track stage changes in activity log
    if (body.stage && body.stage !== existing.stage) {
      const activity = {
        date: new Date().toISOString(),
        type: "status_change" as const,
        text: `Status: ${existing.stage} → ${body.stage}`,
      };
      body.activities = [...(existing.activities || []), activity];

      // First time applied: set appliedAt + followUp
      if (body.stage === "applied" && !existing.appliedAt) {
        body.appliedAt = new Date().toISOString();
        const followUp = new Date();
        followUp.setDate(followUp.getDate() + 5);
        body.followUpAt = followUp.toISOString();
      }
    }

    // Track activity if explicitly added
    if (body.newActivity) {
      const activity = {
        date: new Date().toISOString(),
        type: body.newActivity.type || "note",
        text: body.newActivity.text || "",
      };
      body.activities = [...(existing.activities || []), activity];
      delete body.newActivity;
    }

    const updated = { ...existing, ...body };
    saveApplication(updated);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    deleteApplication(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}
