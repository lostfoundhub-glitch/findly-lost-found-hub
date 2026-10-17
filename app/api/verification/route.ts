import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type VerificationRequest = {
  item_id?: number;
};

type GeneratedQuestions = {
  questions?: unknown;
};

export async function POST(request: Request) {
  try {
    // 1. ตรวจสอบ Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในเซิร์ฟเวอร์" },
        { status: 500 }
      );
    }

    // 2. ตรวจสอบผู้ใช้จาก Session
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนสร้างคำถาม" },
        { status: 401 }
      );
    }

    // 3. รับ ID ของสิ่งของ
    const body = (await request.json()) as VerificationRequest;
    const itemId = Number(body.item_id);

    if (
      !Number.isSafeInteger(itemId) ||
      itemId <= 0
    ) {
      return NextResponse.json(
        { error: "กรุณาระบุ item_id ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบว่าสิ่งของมีอยู่จริง
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select(
        "id, name, category, type, color, color_name, brand, description, created_by"
      )
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      console.error("Findly item lookup error:", itemError);

      return NextResponse.json(
        { error: "ไม่สามารถตรวจสอบข้อมูลสิ่งของได้" },
        { status: 500 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { error: "ไม่พบสิ่งของที่ระบุ" },
        { status: 404 }
      );
    }

    // 5. จำกัดให้ผู้แจ้งสิ่งของเป็นผู้สร้างคำถามได้
    if (item.created_by !== user.id) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์สร้างคำถามสำหรับสิ่งของชิ้นนี้" },
        { status: 403 }
      );
    }

    // 6. สร้างคำถามด้วย Gemini
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
คุณเป็นผู้ช่วยสร้างคำถามยืนยันความเป็นเจ้าของสิ่งของสำหรับ Findly

สร้างคำถามภาษาไทยจำนวน 5 ข้อพอดี โดยใช้ข้อมูลต่อไปนี้

ชื่อสิ่งของ: ${item.name}
หมวดหมู่: ${item.category}
ประเภท: ${item.type}
สี: ${item.color || item.color_name || "ไม่ระบุ"}
ยี่ห้อหรือรุ่น: ${item.brand || "ไม่ระบุ"}
รายละเอียด: ${item.description || "ไม่มีรายละเอียดเพิ่มเติม"}

ข้อกำหนด:
- สร้างคำถามที่ช่วยแยกเจ้าของจริงออกจากผู้ที่คาดเดา
- คำถามต้องเกี่ยวข้องกับประเภทสิ่งของ
- หลีกเลี่ยงการถามข้อมูลที่เปิดเผยอยู่แล้วในประกาศ
- ห้ามถามรหัสผ่าน รหัส OTP หรือข้อมูลส่วนตัวที่อ่อนไหว
- ห้ามสร้างคำตอบหรือเฉลย
- คำถามทั้ง 5 ข้อต้องแตกต่างกัน
- ใช้ภาษาไทยที่เข้าใจง่าย
- ส่ง JSON object เท่านั้น ตามรูปแบบ:
{"questions":["คำถามที่ 1","คำถามที่ 2","คำถามที่ 3","คำถามที่ 4","คำถามที่ 5"]}
`;

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            questions: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["questions"],
        },
      },
    });

    if (!result.text) {
      throw new Error("AI ไม่ได้ส่งคำถามกลับมา");
    }

    const parsed = JSON.parse(result.text) as GeneratedQuestions;

    if (
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== 5 ||
      !parsed.questions.every(
        (question) =>
          typeof question === "string" &&
          question.trim().length > 0
      )
    ) {
      throw new Error("รูปแบบคำถามจาก AI ไม่ถูกต้อง");
    }

    const questions = [
      ...new Set(
        parsed.questions.map((question) =>
          (question as string).trim()
        )
      ),
    ];

    if (questions.length !== 5) {
      throw new Error("AI สร้างคำถามซ้ำกัน กรุณาลองใหม่");
    }

    // 7. ตรวจสอบว่ามีคำถามเดิมสำหรับสิ่งของนี้หรือไม่
    const { data: existingQuestions, error: existingError } =
      await supabase
        .from("owner_verification_questions")
        .select("id")
        .eq("item_id", itemId)
        .limit(1);

    if (existingError) {
      console.error("Findly question lookup error:", existingError);

      return NextResponse.json(
        {
          error:
            "ตรวจสอบคำถามเดิมไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ตาราง owner_verification_questions",
        },
        { status: 500 }
      );
    }

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json(
        {
          error:
            "สิ่งของชิ้นนี้มีคำถามยืนยันความเป็นเจ้าของแล้ว",
        },
        { status: 409 }
      );
    }

    // 8. บันทึกคำถาม 5 ข้อลง Supabase
    const rows = questions.map((question, index) => ({
      item_id: itemId,
      question_text: question,
      question_order: index + 1,
    }));

    const { data: savedQuestions, error: saveError } =
      await supabase
        .from("owner_verification_questions")
        .insert(rows)
        .select("id, item_id, question_text, question_order");

    if (saveError || !savedQuestions || savedQuestions.length !== 5) {
      console.error("Findly save verification questions error:", saveError);

      return NextResponse.json(
        {
          error:
            "สร้างคำถามสำเร็จ แต่บันทึกลงฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ RLS ของตารางคำถาม",
        },
        { status: 500 }
      );
    }

    // 9. ส่งคำถามที่บันทึกแล้วกลับไปยังหน้าเว็บ
    return NextResponse.json({
      success: true,
      item_id: itemId,
      questions: savedQuestions,
    });
  } catch (error) {
    console.error("Findly Gemini verification error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการสร้างคำถามด้วย AI",
      },
      { status: 500 }
    );
  }
}