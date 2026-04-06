import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getApplication, saveApplication } from "@/lib/store";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const app = getApplication(id);
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (!app.contact?.email) return NextResponse.json({ error: "No contact email" }, { status: 400 });
    if (!app.emailSubject?.trim()) return NextResponse.json({ error: "No email subject" }, { status: 400 });
    if (!app.emailBody?.trim()) return NextResponse.json({ error: "No email body" }, { status: 400 });

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "andrew@fahrschulautopilot.de",
      to: app.contact.email,
      subject: app.emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${app.emailBody.split("\n").map((p) => `<p>${p}</p>`).join("")}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #666; font-size: 14px;">
            Andrew Arbo<br/>
            Fürth, Germany<br/>
            andrew@fahrschulautopilot.de<br/>
            <a href="https://github.com/asol1213">GitHub</a> |
            <a href="https://calendly.com/andrewarbohq/30min">Book a Call</a>
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    app.stage = "applied";
    app.appliedAt = app.appliedAt || new Date().toISOString();
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 5);
    app.followUpAt = followUp.toISOString();
    app.activities = [...(app.activities || []), {
      date: new Date().toISOString(),
      type: "email",
      text: `E-Mail gesendet an ${app.contact.email}`,
    }];
    saveApplication(app);

    return NextResponse.json({ ok: true, sentAt: app.appliedAt });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Server error") }, { status: 500 });
  }
}
