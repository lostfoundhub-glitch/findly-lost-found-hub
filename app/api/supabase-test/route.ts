import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json(
      {
        success: false,
        message: "ไม่พบค่า Supabase ในไฟล์ .env.local",
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      supabasePublishableKey
    );

    const { error } = await supabase
      .from("connection_test")
      .select("id")
      .limit(1);

    if (error && error.code !== "42P01") {
      return NextResponse.json(
        {
          success: false,
          message: "เชื่อมต่อ Supabase แล้ว แต่ตรวจสอบตารางไม่สำเร็จ",
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      tableExists: !error,
      message: error
        ? "เชื่อมต่อ Supabase สำเร็จ แต่ยังไม่มีตารางทดสอบ"
        : "เชื่อมต่อ Supabase และอ่านตารางทดสอบได้แล้ว",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "ไม่สามารถเชื่อมต่อ Supabase ได้",
      },
      { status: 500 }
    );
  }
}