"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: number;
  type: "lost" | "found";
  name: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  location: string;
  date: string;
  image: string | null;
  status: string;
};

type VerificationRequest = {
  id: string;
  reportId: string;
  itemName: string;
  itemType: string;
  answers: string[];
  additionalInfo: string;
  status: string;
  createdAt: string;
};

type ItemQuestion = {
  id: number;
  item_id: number;
  question_text: string;
  question_order: number;
};

function formatDate(value: string) {
  if (!value) return "ไม่ระบุวันที่";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric",
  }).format(date);
}

export default function VerificationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [answers, setAnswers] = useState(["", "", ""]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [questionsByItem, setQuestionsByItem] = useState<ItemQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function loadData() {
    setError("");
    try {
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("id, name, category, type, color, brand, description, location, date, image, status")
        .eq("status", "active")
        .eq("type", "found")
        .order("created_at", { ascending: false });
      if (itemError) throw itemError;
      setReports((itemData ?? []) as Report[]);

      const { data: authData, error: authError } = await supabase.auth.getUser();

      // ไม่มี session ถือว่าเป็นผู้ใช้ที่ยังไม่ได้เข้าสู่ระบบ ไม่ควรทำให้การโหลด items ล้มเหลว
      if (authError && authError.name !== "AuthSessionMissingError") {
        throw authError;
      }

      if (!authError && authData.user) {
        const { data: claimData, error: claimError } = await supabase
          .from("item_claims")
          .select("id, item_id, status, created_at, items(name, type), owner_verification_answers(answer_text, question_id, owner_verification_questions(question_text, question_order))")
          .eq("claimant_id", authData.user.id)
          .order("created_at", { ascending: false });
        if (claimError) throw claimError;
        const mapped: VerificationRequest[] = (claimData ?? []).map((claim: any) => {
          const answerRows = [...(claim.owner_verification_answers ?? [])].sort(
            (a: any, b: any) => (a.owner_verification_questions?.question_order ?? 0) - (b.owner_verification_questions?.question_order ?? 0)
          );
          return {
            id: String(claim.id),
            reportId: String(claim.item_id),
            itemName: claim.items?.name ?? "ไม่ระบุชื่อสิ่งของ",
            itemType: claim.items?.type ?? "lost",
            answers: answerRows.map((a: any) => `${a.owner_verification_questions?.question_text ?? "คำตอบ"}: ${a.answer_text}`),
            additionalInfo: "",
            status: claim.status === "pending" ? "รอตรวจสอบ" : claim.status === "under_review" ? "กำลังตรวจสอบ" : claim.status === "approved" ? "อนุมัติแล้ว" : claim.status === "rejected" ? "ไม่อนุมัติ" : claim.status === "cancelled" ? "ยกเลิก" : claim.status,
            createdAt: claim.created_at,
          };
        });
        setRequests(mapped);
      } else {
        // ยังไม่เข้าสู่ระบบ: แสดงรายการสิ่งของได้ แต่ไม่มีประวัติคำขอของผู้ใช้
        setRequests([]);
      }
    } catch (err) {
      console.error("Findly verification loading error:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "ไม่ทราบสาเหตุ";
      setError(`โหลดข้อมูลไม่สำเร็จ: ${message}`);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
  if (reports.length === 0) return;

  const params = new URLSearchParams(window.location.search);
  const requestedItemId = params.get("itemId");

  if (!requestedItemId) return;

  const itemExists = reports.some(
    (report) => String(report.id) === requestedItemId
  );

  if (itemExists) {
    setSelectedId(requestedItemId);
    setActiveTab("form");
  }
}, [reports]);

  const items = useMemo(() => reports.map((report) => ({
    ...report,
    _id: String(report.id),
    _name: report.name,
    _type: report.type,
  })), [reports]);

  const selectedItem = items.find((item) => item._id === selectedId);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setQuestionsByItem([]);
      setAnswers([]);

      if (!selectedId) {
        setQuestionsLoading(false);
        return;
      }

      setError("");
      setQuestionsLoading(true);

      try {
        // Questions are readable only by authenticated users under the current RLS policy.
        // Check the current session before querying the protected table.
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !authData.user) {
          setError("กรุณาเข้าสู่ระบบก่อนดูคำถามและส่งคำขอยืนยันความเป็นเจ้าของ");
          return;
        }

        const { data, error: questionError } = await supabase
          .from("owner_verification_questions")
          .select("id, item_id, question_text, question_order")
          .eq("item_id", Number(selectedId))
          .order("question_order", { ascending: true });

        if (cancelled) return;

        if (questionError) {
          console.error("Findly owner verification questions error:", {
            message: questionError.message,
            code: questionError.code,
            details: questionError.details,
            hint: questionError.hint,
          });
          setError(`โหลดคำถามไม่สำเร็จ: ${questionError.message || questionError.code || "ไม่ทราบสาเหตุ"}`);
          return;
        }

        const rows = (data ?? []) as ItemQuestion[];
        setQuestionsByItem(rows);
        setAnswers(rows.map(() => ""));

        if (rows.length === 0) {
          setError("รายการนี้ยังไม่มีคำถามยืนยันเจ้าของ กรุณาให้เจ้าของหรือผู้ดูแลเพิ่มคำถามก่อน");
        }
      } catch (err) {
        console.error("Findly owner verification questions unexpected error:", err);
        setError(
          err instanceof Error
            ? `โหลดคำถามไม่สำเร็จ: ${err.message}`
            : "โหลดคำถามไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ Supabase"
        );
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }

    void loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [selectedId, supabase]);

  function updateAnswer(index: number, value: string) {
    setAnswers((previous) => previous.map((answer, answerIndex) => answerIndex === index ? value : answer));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedItem) {
      setError("กรุณาเลือกสิ่งของที่ต้องการยืนยันความเป็นเจ้าของ");
      return;
    }
    if (questionsByItem.length === 0) {
      setError("รายการนี้ยังไม่มีคำถามยืนยันเจ้าของ กรุณาให้เจ้าของหรือผู้ดูแลเพิ่มคำถามก่อน");
      return;
    }
    if (answers.length !== questionsByItem.length || answers.some((answer) => !answer.trim())) {
      setError("กรุณาตอบคำถามยืนยันความเป็นเจ้าของให้ครบทุกข้อ");
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      // การส่งคำขอต้องมีผู้ใช้ที่เข้าสู่ระบบแล้ว
      if (authError && authError.name !== "AuthSessionMissingError") {
        throw authError;
      }
      if (!authData.user) {
        setError("กรุณาเข้าสู่ระบบก่อนส่งคำขอยืนยันความเป็นเจ้าของ");
        return;
      }

      const { data: claim, error: claimError } = await supabase
        .from("item_claims")
        .insert({ item_id: Number(selectedId), claimant_id: authData.user.id, status: "pending" })
        .select("id, item_id, status, created_at")
        .single();
      if (claimError) throw claimError;

      const answerRows = questionsByItem.map((question, index) => ({
        claim_id: claim.id,
        question_id: question.id,
        answer_text: answers[index].trim() + (index === questionsByItem.length - 1 && additionalInfo.trim() ? `\nข้อมูลเพิ่มเติม: ${additionalInfo.trim()}` : ""),
      }));
      const { error: answerError } = await supabase.from("owner_verification_answers").insert(answerRows);
      if (answerError) {
        // Remove the incomplete claim if saving its answers failed.
        await supabase.from("item_claims").delete().eq("id", claim.id).eq("claimant_id", authData.user.id);
        throw answerError;
      }

      setAnswers(questionsByItem.map(() => ""));
      setAdditionalInfo("");
      setSuccess("ส่งคำขอยืนยันความเป็นเจ้าของและบันทึกคำตอบลงฐานข้อมูลแล้ว สถานะปัจจุบันคือรอตรวจสอบ");
      setActiveTab("history");
      await loadData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Findly verification submit error:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "ไม่ทราบสาเหตุ";
      setError(`ส่งคำขอไม่สำเร็จ: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="verification-background min-h-screen bg-[#FFFAF7] text-[#493D55]">
      <style jsx>{`
        .verification-background {
          background-image:
            radial-gradient(
              circle at 4% 15%,
              rgba(247, 220, 235, 0.5) 0 75px,
              transparent 77px
            ),
            radial-gradient(
              circle at 96% 40%,
              rgba(229, 221, 251, 0.6) 0 90px,
              transparent 92px
            ),
            radial-gradient(
              circle at 12% 85%,
              rgba(221, 245, 236, 0.5) 0 60px,
              transparent 62px
            );
          background-size: 100% 1000px;
          background-repeat: repeat-y;
        }

        .soft-card {
          box-shadow: 0 14px 40px rgba(116, 88, 143, 0.08);
        }

        .field {
          width: 100%;
          border: 1px solid #eadfec;
          border-radius: 15px;
          background: white;
          padding: 12px 14px;
          color: #493d55;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .field:focus {
          border-color: #b9a0f8;
          box-shadow: 0 0 0 3px rgba(185, 160, 248, 0.18);
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 800;
          color: #655570;
        }

        .tab-button {
          border-radius: 14px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 800;
          transition: background 160ms ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .field,
          .tab-button {
            transition: none;
          }
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-[#F0E7F1] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="กลับหน้าแรก Findly"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0E8FF] text-2xl">
              🔎
            </span>

            <span>
              <span className="block text-2xl font-black leading-none">
                findly<span className="text-[#B9A0F8]">.</span>
              </span>

              <span className="mt-1 block text-[9px] font-extrabold tracking-[2px] text-[#9B8AAF]">
                LOST &amp; FOUND HUB
              </span>
            </span>
          </Link>

          <Link
            href="/tracking"
            className="rounded-full border border-[#E9DFF0] px-4 py-2.5 text-xs font-bold hover:bg-[#F7F1FF] sm:text-sm"
          >
            ติดตามสถานะ ↗
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-9 sm:px-8 sm:pt-12">
        {/* Title */}
        <section className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-[#F0E8FF] px-4 py-2 text-xs font-extrabold tracking-wide text-[#8064B5]">
            ✦ OWNER VERIFICATION
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            ยืนยันความเป็นเจ้าของ
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8B7D94] sm:text-base">
            ช่วยตรวจสอบข้อมูลให้มั่นใจว่าสิ่งของจะกลับคืนสู่เจ้าของที่แท้จริง 💜
          </p>
        </section>

        {/* Privacy notice */}
        <section className="mb-6 flex items-start gap-3 rounded-[22px] border border-[#E5DDFB] bg-white/90 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0E8FF] text-xl">
            🛡️
          </span>

          <div>
            <h2 className="font-black">ข้อมูลของคุณควรได้รับการปกป้อง</h2>

            <p className="mt-1 text-sm leading-6 text-[#8B7D94]">
              ตอบคำถามโดยให้รายละเอียดที่ช่วยยืนยันความเป็นเจ้าของ
              หลีกเลี่ยงการเปิดเผยรหัสผ่าน รหัสยืนยันตัวตน
              หรือข้อมูลส่วนตัวที่ไม่จำเป็น
            </p>
          </div>
        </section>

        {/* Feedback */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-[#BDE8D8] bg-[#EEFCF6] p-4 text-sm leading-7 text-[#26765F]"
          >
            💚 {success}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#F4C6CF] bg-[#FFF0F3] p-4 text-sm leading-7 text-[#A83E59]"
          >
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-2 rounded-[18px] border border-[#F0E7F1] bg-white p-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("form");
              setError("");
              setSuccess("");
            }}
            className="tab-button flex-1"
            style={{
              background:
                activeTab === "form" ? "#F0E8FF" : "transparent",
              color:
                activeTab === "form" ? "#8064B5" : "#9B8AAF",
            }}
          >
            ✍️ ส่งคำขอยืนยัน
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setError("");
              setSuccess("");
            }}
            className="tab-button flex-1"
            style={{
              background:
                activeTab === "history" ? "#F0E8FF" : "transparent",
              color:
                activeTab === "history" ? "#8064B5" : "#9B8AAF",
            }}
          >
            📋 ประวัติคำขอ ({requests.length})
          </button>
        </div>

        {/* Form */}
        {activeTab === "form" && (
          <form
            onSubmit={handleSubmit}
            className="soft-card rounded-[28px] border border-[#F0E7F1] bg-white p-5 sm:p-8"
          >
            <div>
              <h2 className="text-xl font-black">
                ข้อมูลสิ่งของที่ต้องการรับคืน
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                เลือกรายการที่เกี่ยวข้องและตอบคำถามให้ครบทุกข้อ
              </p>
            </div>

            <div className="mt-6">
              <label className="field-label" htmlFor="verification-item">
                เลือกสิ่งของ <span className="text-[#E58CA3]">*</span>
              </label>

              <select
                id="verification-item"
                className="field"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                required
              >
                <option value="">เลือกสิ่งของที่ต้องการยืนยัน</option>

                {items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item._name} —{" "}
                    {item._type === "lost" ? "ของหาย" : "ของที่พบ"}
                  </option>
                ))}
              </select>

              {!ready && (
                <p className="mt-2 text-xs text-[#9B8AAF]">
                  กำลังโหลดรายการ...
                </p>
              )}

              {selectedItem && questionsLoading && (
                <p className="mt-2 text-xs leading-6 text-[#9B8AAF]">
                  กำลังโหลดคำถามยืนยันเจ้าของ...
                </p>
              )}

              {selectedItem && ready && !questionsLoading && !error && questionsByItem.length === 0 && (
                <p className="mt-2 text-xs leading-6 text-[#A83E59]">
                  รายการนี้ยังไม่มีคำถามยืนยันเจ้าของ จึงยังส่งคำขอไม่ได้
                </p>
              )}

              {ready && items.length === 0 && (
                <div className="mt-3 rounded-2xl bg-[#FCF9FF] p-4 text-sm leading-6 text-[#8B7D94]">
                  ยังไม่มีรายการสิ่งของที่มีผู้พบและเปิดรับการยืนยันเจ้าของในขณะนี้
                  <Link
                    href="/report"
                    className="ml-1 font-extrabold text-[#8064B5] underline"
                  >
                    แจ้งสิ่งของใหม่
                  </Link>
                </div>
              )}
            </div>

            {selectedItem && (
              <div className="mt-5 flex items-start gap-4 rounded-[20px] bg-[#FCF9FF] p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F0E8FF] text-3xl">
                  {(() => {
                    const image =
                      typeof selectedItem.image === "string"
                        ? selectedItem.image
                        : "";

                    return image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={selectedItem._name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "📦"
                    );
                  })()}
                </div>

                <div className="min-w-0">
                  <p className="break-words font-black">
                    {selectedItem._name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#8B7D94]">
                    {selectedItem.category || "ไม่ระบุหมวดหมู่"}
                    {selectedItem.color
                      ? ` · สี${selectedItem.color}`
                      : ""}
                  </p>

                  {selectedItem.location && (
                    <p className="mt-1 break-words text-xs text-[#8B7D94]">
                      📍 {selectedItem.location}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="my-7 border-t border-dashed border-[#E9DFED]" />

            <div>
              <h2 className="text-lg font-black">
                คำถามยืนยันความเป็นเจ้าของ
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                คำตอบควรมีรายละเอียดเฉพาะที่ช่วยแยกสิ่งของของคุณออกจากสิ่งของอื่น
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {questionsByItem.map((question, index) => (
                <div key={question.id}>
                  <label
                    className="field-label"
                    htmlFor={`verification-answer-${index}`}
                  >
                    {index + 1}. {question.question_text}{" "}
                    <span className="text-[#E58CA3]">*</span>
                  </label>

                  <p className="mb-2 text-xs leading-5 text-[#9B8AAF]">
                    ตอบตามรายละเอียดของสิ่งของที่คุณทราบ
                  </p>

                  <textarea
                    id={`verification-answer-${index}`}
                    className="field min-h-24 resize-y"
                    value={answers[index]}
                    onChange={(event) =>
                      updateAnswer(index, event.target.value)
                    }
                    placeholder="พิมพ์คำตอบของคุณ"
                    maxLength={500}
                    required
                  />

                  <p className="mt-1 text-right text-xs text-[#B5A9BD]">
                    {answers[index].length}/500 ตัวอักษร
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="field-label" htmlFor="verification-extra">
                ข้อมูลเพิ่มเติม (ไม่บังคับ)
              </label>

              <textarea
                id="verification-extra"
                className="field min-h-24 resize-y"
                value={additionalInfo}
                onChange={(event) =>
                  setAdditionalInfo(event.target.value)
                }
                placeholder="รายละเอียดเพิ่มเติมที่ช่วยยืนยันความเป็นเจ้าของ"
                maxLength={1000}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-[#F3E5C5] bg-[#FFFBF0] p-4">
              <p className="text-sm font-extrabold text-[#8B6C32]">
                ⚠️ โปรดทราบ
              </p>

              <p className="mt-2 text-xs leading-6 text-[#9A8358]">
                แบบฟอร์มนี้เป็นต้นแบบสำหรับเตรียมคำขอยืนยันความเป็นเจ้าของ
                คำตอบจะถูกบันทึกลงฐานข้อมูลเพื่อให้ผู้ดูแลตรวจสอบ คำขอยังไม่ถือว่าได้รับอนุมัติจนกว่าจะมีการตรวจสอบ
              </p>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/tracking"
                className="rounded-full px-5 py-3 text-center text-sm font-bold text-[#8B7D94] hover:bg-[#FAF5FC]"
              >
                ← กลับหน้าติดตาม
              </Link>

              <button
                type="submit"
                disabled={!ready || items.length === 0 || saving || questionsLoading || questionsByItem.length === 0}
                className="rounded-full bg-[#B9A0F8] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 transition hover:bg-[#A58BE8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ส่งคำขอยืนยัน ✦
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {activeTab === "history" && (
          <section className="soft-card rounded-[28px] border border-[#F0E7F1] bg-white p-5 sm:p-8">
            <h2 className="text-xl font-black">ประวัติคำขอของฉัน</h2>

            <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
              รายการคำขอที่บันทึกไว้ในฐานข้อมูล Supabase
            </p>

            {!ready ? (
              <div className="mt-6 rounded-2xl bg-[#FCF9FF] p-8 text-center text-sm text-[#9B8AAF]">
                กำลังโหลดข้อมูล...
              </div>
            ) : requests.length === 0 ? (
              <div className="mt-6 rounded-[22px] bg-[#FCF9FF] px-5 py-12 text-center">
                <div className="text-4xl">📋</div>

                <h3 className="mt-4 font-black">
                  ยังไม่มีประวัติคำขอ
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                  เมื่อคุณส่งแบบฟอร์ม คำขอจะแสดงในส่วนนี้
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="mt-5 rounded-full bg-[#B9A0F8] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#A58BE8]"
                >
                  ส่งคำขอใหม่
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {requests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-[20px] border border-[#F0E7F1] p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <h3 className="break-words font-black">
                          {request.itemName}
                        </h3>

                        <p className="mt-2 text-xs text-[#9B8AAF]">
                          ส่งคำขอเมื่อ {formatDate(request.createdAt)}
                        </p>
                      </div>

                      <span className="h-fit w-fit rounded-full bg-[#FFF3D8] px-3 py-1.5 text-xs font-extrabold text-[#9A6A13]">
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[#FCF9FF] p-4">
                      <p className="text-xs font-extrabold text-[#8064B5]">
                        คำตอบที่บันทึกไว้
                      </p>

                      <div className="mt-3 space-y-3">
                        {request.answers.map((answer, index) => (
                          <div key={`${request.id}-${index}`}>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{answer || "ไม่ได้ระบุ"}</p>
                          </div>
                        ))}

                        {request.additionalInfo && (
                          <div>
                            <p className="text-xs font-bold text-[#8B7D94]">
                              ข้อมูลเพิ่มเติม
                            </p>

                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                              {request.additionalInfo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-6 text-[#9B8AAF]">
                      สถานะนี้มาจากฐานข้อมูล และจะเปลี่ยนเมื่อระบบผู้ดูแลอัปเดตคำขอ
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="mt-8 text-center text-xs leading-6 text-[#B5A9BD]">
          Findly · Lost &amp; Found Hub
          <br />
          ช่วยกันตามหา เพื่อให้สิ่งของได้กลับคืนสู่เจ้าของ 💜
        </footer>
      </div>
    </main>
  );
}