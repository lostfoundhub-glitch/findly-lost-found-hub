"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        console.error("Login error:", loginError);

        setError(
          "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมล รหัสผ่าน และการยืนยันอีเมล"
        );

        return;
      }

      // เข้าสู่ระบบสำเร็จ ให้กลับไปหน้าแรก
      window.location.href = "/";
    } catch (err) {
      console.error("Login error:", err);

      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFCF7] px-4 py-10 text-[#49376F]">
      <div className="w-full max-w-md">
        {/* ปุ่มกลับหน้าแรก */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#887C98] transition hover:text-[#8B6CE0]"
        >
          ← กลับหน้าแรก
        </Link>

        {/* กล่องเข้าสู่ระบบ */}
        <div className="rounded-[32px] border border-[#F0EAF7] bg-white p-7 shadow-[0_15px_50px_rgba(116,88,157,0.10)] sm:p-10">
          {/* โลโก้ */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDE5FF] text-4xl">
              🔎
            </div>

            <h1 className="text-3xl font-black">
              ยินดีต้อนรับกลับมา
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#91859F]">
              เข้าสู่ระบบ Findly เพื่อช่วยกันตามหาสิ่งของ
            </p>
          </div>

          {/* แบบฟอร์ม */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold"
              >
                อีเมล
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="กรอกอีเมลของคุณ"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-[#E8DFFF] bg-[#FFFCFF] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#B2A5B9] focus:border-[#B9A0F8] focus:ring-4 focus:ring-[#B9A0F8]/15"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold"
              >
                รหัสผ่าน
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-2xl border border-[#E8DFFF] bg-[#FFFCFF] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#B2A5B9] focus:border-[#B9A0F8] focus:ring-4 focus:ring-[#B9A0F8]/15"
              />
            </div>

            {/* ข้อความแจ้งเตือน */}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600"
              >
                {error}
              </div>
            )}

            {/* ปุ่มเข้าสู่ระบบ */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-[#B9A0F8] to-[#A58AEF] px-6 py-4 font-bold text-white shadow-[0_5px_15px_rgba(165,138,239,0.25)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          {/* สมัครสมาชิก */}
          <div className="mt-7 text-center text-sm text-[#91859F]">
            ยังไม่มีบัญชีใช่ไหม?{" "}
            <Link
              href="/signup"
              className="font-bold text-[#9479D7] transition hover:text-[#8068B4]"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#A296B1]">
          Made with ♡ by Findly Lost & Found Hub
        </p>
      </div>
    </main>
  );
}