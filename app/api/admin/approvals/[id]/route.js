import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";

async function sendEmail(to, action) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (action === "approved") {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: "Your Capstone Library adviser account has been approved",
      text: `Your Capstone Library adviser account has been reviewed and approved. You can now log in at ${appUrl} to access your adviser portal.`,
    });
  } else {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: "Your Capstone Library adviser account application was not approved",
      text: `Your Capstone Library adviser account application has been reviewed and was not approved.`,
    });
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await request.json();

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: target, error: fetchErr } = await admin
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("id", id)
      .single();

    if (fetchErr || !target) {
      return NextResponse.json({ error: "Adviser not found" }, { status: 404 });
    }

    if (target.role !== "capstone_adviser") {
      return NextResponse.json({ error: "Target is not a capstone adviser" }, { status: 400 });
    }

    const newStatus = action === "approved" ? "active" : "rejected";
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateErr) throw updateErr;

    const { data: authUser } = await admin.auth.admin.getUserById(id);
    const email = authUser?.user?.email;

    if (email && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        await sendEmail(email, action);
      } catch (emailErr) {
        console.error("[approvals] Email send failed:", emailErr);
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[PATCH /api/admin/approvals/[id]]", err);
    return NextResponse.json({ error: "Failed to process application" }, { status: 500 });
  }
}
