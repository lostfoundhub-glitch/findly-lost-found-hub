import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EmailRequest = {
  subject?: string;
  title?: string;
  message?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return NextResponse.json(
        {
          error:
            "กรุณาตรวจสอบ RESEND_API_KEY และ RESEND_FROM_EMAIL ใน .env.local",
        },
        { status: 500 }
      );
    }

    // ตรวจสอบเซสชันผู้ใช้จาก Supabase Auth
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนส่งอีเมล" },
        { status: 401 }
      );
    }

    // อ่านข้อมูลอีเมลที่ต้องการส่ง
    const body = (await request.json()) as EmailRequest;

    const subject = body.subject?.trim();
    const title = body.title?.trim();
    const message = body.message?.trim();

    if (!subject || !title || !message) {
      return NextResponse.json(
        { error: "กรุณาระบุ subject, title และ message" },
        { status: 400 }
      );
    }

    if (
      subject.length > 150 ||
      title.length > 150 ||
      message.length > 5000
    ) {
      return NextResponse.json(
        { error: "ข้อความยาวเกินขนาดที่กำหนด" },
        { status: 400 }
      );
    }

    // ส่งไปยังอีเมลของผู้ใช้ที่เข้าสู่ระบบเท่านั้น
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject,
      text: `${title}\n\n${message}\n\nFindly — Lost & Found Hub`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#493D55;line-height:1.8">
          <div style="background:#F4EEFF;padding:24px;border-radius:16px">
            <h1 style="color:#8D6CE5">Findly.</h1>
            <h2>${escapeHtml(title)}</h2>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
            <hr style="border:none;border-top:1px solid #EDE5F4;margin:24px 0" />
            <p style="font-size:12px;color:#8B7D94">
              อีเมลแจ้งเตือนจาก Findly — Lost & Found Hub
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          error:
            "ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า Resend",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ส่งคำขออีเมลสำเร็จ",
      id: data?.id,
    });
  } catch (error) {
    console.error("Email API error:", error);

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งอีเมล" },
      { status: 500 }
    );
  }
}