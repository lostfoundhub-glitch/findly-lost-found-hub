"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notice = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = "findly_notifications";

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotices(parsed);
        }
      }
    } catch {
      setNotices([]);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
    }
  }, [notices, loaded]);

  const unreadCount = notices.filter((notice) => !notice.read).length;

  function addDemoNotice() {
    const notice: Notice = {
      id: crypto.randomUUID(),
      title: "ยินดีต้อนรับสู่ Findly",
      message:
        "นี่คือการแจ้งเตือนตัวอย่าง คุณสามารถทดลองอ่านและลบรายการนี้ได้",
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotices((previous) => [notice, ...previous]);
  }

  function markAsRead(id: string) {
    setNotices((previous) =>
      previous.map((notice) =>
        notice.id === id ? { ...notice, read: true } : notice
      )
    );
  }

  async function sendTestEmail() {
    setSending(true);
    setEmailMessage("");
    setEmailError(false);

    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: "Findly - ทดสอบระบบอีเมล",
          title: "ทดสอบระบบแจ้งเตือน Findly",
          message:
            "นี่คืออีเมลทดสอบจาก Findly หากคุณได้รับอีเมลนี้ แสดงว่าระบบส่งอีเมลสามารถส่งข้อความมาถึงบัญชีของคุณได้",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `ส่งอีเมลไม่สำเร็จ (${response.status})`
        );
      }

      setEmailMessage(
        "ส่งคำขอสำเร็จแล้วครับ โปรดตรวจสอบกล่องจดหมายและ Spam/Junk"
      );
    } catch (error) {
      setEmailError(true);
      setEmailMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการส่งอีเมล"
      );
    } finally {
      setSending(false);
    }
  }

  function deleteNotice(id: string) {
    setNotices((previous) =>
      previous.filter((notice) => notice.id !== id)
    );
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
            ติดตามความคืบหน้าของรายการของหาย และทดสอบระบบแจ้งเตือนทางอีเมล
          </p>

          <div className="mt-6 rounded-2xl bg-[#F4EEFF] p-5">
            <div className="mb-1 text-sm text-[#8B7D94]">
              การแจ้งเตือนที่ยังไม่ได้อ่าน
            </div>
            <div className="text-3xl font-extrabold text-[#8D6CE5]">
              {unreadCount}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-[#EDE5F4] bg-white p-6">
          <h2 className="mb-2 text-xl font-bold">
            📧 ทดสอบส่งอีเมล
          </h2>

          <p className="mb-4 text-sm leading-7 text-[#8B7D94]">
            ระบบจะส่งอีเมลไปยังบัญชีที่เข้าสู่ระบบอยู่
            โดยใช้ Supabase Auth ตรวจสอบตัวตนก่อนส่ง
          </p>

          <button
            type="button"
            onClick={sendTestEmail}
            disabled={sending}
            className="rounded-xl bg-[#B9A0F8] px-5 py-3 font-bold text-[#493D55] transition hover:bg-[#A88AEF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "กำลังส่งอีเมล..." : "ส่งอีเมลทดสอบ"}
          </button>

          {emailMessage && (
            <div
              role="status"
              className={`mt-4 rounded-xl p-4 text-sm leading-6 ${
                emailError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {emailMessage}
            </div>
          )}
        </section>

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">
            รายการแจ้งเตือนของคุณ
          </h2>

          <button
            type="button"
            onClick={addDemoNotice}
            className="rounded-xl border border-[#B9A0F8] bg-white px-4 py-2 text-sm font-bold text-[#8D6CE5]"
          >
            + เพิ่มตัวอย่าง
          </button>
        </section>

        {!loaded ? (
          <p className="p-6 text-center text-[#8B7D94]">
            กำลังโหลด...
          </p>
        ) : notices.length === 0 ? (
          <section className="rounded-3xl border border-[#EDE5F4] bg-white p-10 text-center">
            <div className="mb-3 text-4xl">🌷</div>
            <h3 className="mb-2 text-lg font-bold">
              ยังไม่มีการแจ้งเตือน
            </h3>
            <p className="text-sm text-[#8B7D94]">
              เมื่อมีรายการแจ้งเตือน จะแสดงที่บริเวณนี้
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className={`rounded-2xl border bg-white p-5 ${
                  notice.read
                    ? "border-[#EDE5F4]"
                    : "border-[#B9A0F8]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔔</div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{notice.title}</h3>

                      {!notice.read && (
                        <span className="rounded-full bg-[#FFE9F0] px-2 py-1 text-xs font-bold text-[#C94F70]">
                          ใหม่
                        </span>
                      )}
                    </div>

                    <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-[#8B7D94]">
                      {notice.message}
                    </p>

                    <p className="mb-4 text-xs text-[#8B7D94]">
                      {new Date(notice.createdAt).toLocaleString("th-TH")}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {!notice.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notice.id)}
                          className="rounded-lg bg-[#F4EEFF] px-3 py-2 text-sm font-semibold"
                        >
                          ทำเครื่องหมายว่าอ่านแล้ว
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteNotice(notice.id)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 rounded-2xl bg-[#F4EEFF] p-4 text-sm leading-7 text-[#8B7D94]">
          หมายเหตุ: รายการแจ้งเตือนในหน้านี้จัดเก็บในเบราว์เซอร์
          ส่วนอีเมลทดสอบจะส่งผ่าน API และ Resend
          การแจ้งเตือนอัตโนมัติจาก Smart Match และสถานะรายการ
          จะต้องเชื่อมเพิ่มในขั้นตอนถัดไป
        </p>
      </div>
    </main>
  );
}