"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) {
        console.error("Supabase signup error:", signupError);
        setError(
          "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบอีเมลและลองใหม่อีกครั้ง"
        );
        return;
      }

      if (data.session) {
        window.location.assign("/");
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Signup error:", err);
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-purple-100 bg-white p-8 shadow-xl shadow-purple-100/50">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-3xl font-bold tracking-tight text-purple-700"
          >
            Findly
          </Link>

          <h1 className="mt-5 text-2xl font-bold text-gray-800">
            สมัครสมาชิก
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            สร้างบัญชีเพื่อเริ่มใช้งาน Findly
          </p>
        </div>

        {success ? (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center"
          >
            <h2 className="font-semibold text-green-800">
              สมัครสมาชิกเรียบร้อยแล้ว
            </h2>

            <p className="mt-2 text-sm leading-6 text-green-700">
              เราส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว
              กรุณาเปิดอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ
            </p>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                อีเมล
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                ใช้ Gmail หรืออีเมลทั่วไปที่คุณเข้าถึงได้
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                รหัสผ่าน
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                ยืนยันรหัสผ่าน
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          มีบัญชีอยู่แล้ว?{" "}
          <Link
            href="/login"
            className="font-semibold text-purple-700 hover:text-purple-900"
          >
            เข้าสู่ระบบ
          </Link>
        </p>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 transition hover:text-purple-700"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </main>
  );
}