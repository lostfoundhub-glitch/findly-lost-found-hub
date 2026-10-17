"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const supabase = createClient();

  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setNotices([]);
        setErrorMessage("กรุณาเข้าสู่ระบบก่อนดูการแจ้งเตือน");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, related_id, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setNotices((data ?? []) as Notice[]);
    } catch (error) {
      console.error("Load notifications error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดการแจ้งเตือนได้ กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notices.filter((notice) => !notice.is_read).length;

  async function markAsRead(id: string) {
    setActionId(id);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("ไม่สามารถเปลี่ยนสถานะการแจ้งเตือนได้");
      }

      setNotices((previous) =>
        previous.map((notice) =>
          notice.id === id ? { ...notice, is_read: true } : notice
        )
      );
    } catch (error) {
      console.error("Mark notification as read error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้"
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteNotice(id: string) {
    const confirmed = window.confirm("ต้องการลบการแจ้งเตือนนี้ใช่ไหม?");
    if (!confirmed) return;

    setActionId(id);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const { data, error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("ไม่สามารถลบการแจ้งเตือนได้");
      }

      setNotices((previous) =>
        previous.filter((notice) => notice.id !== id)
      );
    } catch (error) {
      console.error("Delete notification error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถลบการแจ้งเตือนได้"
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] px-5 py-8 text-[#493D55]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-3xl font-extrabold">
            Findly<span className="text-[#8D6CE5]">.</span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-[#B9A0F8] px-4 py-2 font-semibold text-[#8D6CE5]"
          >
            ← กลับหน้าหลัก
          </Link>
        </header>

        <section className="mb-6 rounded-3xl border border-[#EDE5F4] bg-white p-6 sm:p-8">
          <div className="mb-3 inline-block rounded-full bg-[#FFE9F0] px-3 py-1 text-sm font-bold text-[#8D6CE5]">
            NOTIFICATION CENTER
          </div>

          <h1 className="mb-3 text-3xl font-extrabold">
            การแจ้งเตือน 🔔
          </h1>

          <p className="leading-7 text-[#8B7D94]">
            ติดตามความคืบหน้าของรายการของหายและการนัดหมายรับคืน
          </p>

          <div className="mt-6 rounded-2xl bg-[#F4EEFF] p-5">
            <div className="mb-1 text-sm text-[#8B7D94]">
              การแจ้งเตือนที่ยังไม่ได้อ่าน
            </div>

            <div className="text-3xl font-extrabold text-[#8D6CE5]">
              {loading ? "..." : unreadCount}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadNotifications(true)}
            disabled={loading || refreshing || actionId !== null}
            className="mt-4 rounded-xl border border-[#B9A0F8] px-4 py-2 text-sm font-bold text-[#8D6CE5] transition hover:bg-[#F4EEFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "กำลังโหลด..." : "↻ โหลดการแจ้งเตือนใหม่"}
          </button>
        </section>

        {errorMessage && (
          <section
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700"
          >
            {errorMessage}
          </section>
        )}

        <section className="mb-5">
          <h2 className="text-xl font-extrabold">
            รายการแจ้งเตือนของคุณ
          </h2>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-[#EDE5F4] bg-white p-10 text-center text-[#8B7D94]">
            กำลังโหลดการแจ้งเตือน...
          </section>
        ) : notices.length === 0 ? (
          <section className="rounded-3xl border border-[#EDE5F4] bg-white p-10 text-center">
            <div className="mb-3 text-4xl">🌷</div>

            <h3 className="mb-2 text-lg font-bold">
              ยังไม่มีการแจ้งเตือน
            </h3>

            <p className="text-sm leading-7 text-[#8B7D94]">
              เมื่อมีการแจ้งเตือนสำหรับบัญชีของคุณ
              รายการจะแสดงที่บริเวณนี้
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className={`rounded-2xl border bg-white p-5 ${
                  notice.is_read
                    ? "border-[#EDE5F4]"
                    : "border-[#B9A0F8]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔔</div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{notice.title}</h3>

                      {!notice.is_read && (
                        <span className="rounded-full bg-[#FFE9F0] px-2 py-1 text-xs font-bold text-[#C94F70]">
                          ใหม่
                        </span>
                      )}
                    </div>

                    <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-[#8B7D94]">
                      {notice.message}
                    </p>

                    <p className="mb-4 text-xs text-[#8B7D94]">
                      {new Date(notice.created_at).toLocaleString("th-TH")}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {!notice.is_read && (
                        <button
                          type="button"
                          onClick={() => void markAsRead(notice.id)}
                          disabled={actionId !== null}
                          className="rounded-lg bg-[#F4EEFF] px-3 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                          {actionId === notice.id
                            ? "กำลังบันทึก..."
                            : "ทำเครื่องหมายว่าอ่านแล้ว"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void deleteNotice(notice.id)}
                        disabled={actionId !== null}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
                      >
                        {actionId === notice.id ? "กำลังดำเนินการ..." : "ลบ"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 rounded-2xl bg-[#F4EEFF] p-4 text-sm leading-7 text-[#8B7D94]">
          ระบบนี้จัดเก็บการแจ้งเตือนในฐานข้อมูล Supabase
          และแสดงเฉพาะรายการที่บัญชีของคุณมีสิทธิ์เข้าถึง
          การแจ้งเตือนอัตโนมัติจากสถานะสิ่งของและการนัดหมาย
          จะเชื่อมต่อในขั้นตอนถัดไป
        </p>
      </div>
    </main>
  );
}