"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuGroups = [
  {
    title: "หน้าหลัก",
    items: [
      { label: "หน้าแรก", href: "/", icon: "🏠" },
      { label: "แจ้งของหาย / ของที่พบ", href: "/report", icon: "📦" },
      { label: "รายการสิ่งของ", href: "/items", icon: "🗂️" },
      { label: "Clue Page", href: "/clue", icon: "🔎" },
      { label: "Smart Match", href: "/clue-matching", icon: "🎯" },
    ],
  },
  {
    title: "ติดตามสิ่งของ",
    items: [
      { label: "ติดตามสถานะ", href: "/tracking", icon: "📍" },
      { label: "ยืนยันความเป็นเจ้าของ", href: "/verification", icon: "🛡️" },
      { label: "นัดหมายรับคืน", href: "/scheduling", icon: "📅" },
    ],
  },
  {
    title: "บริการเพิ่มเติม",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: "🛍️" },
      { label: "แนะนำสินค้าทดแทน", href: "/replacement", icon: "🔄" },
      { label: "คะแนนและรางวัล", href: "/rewards", icon: "💜" },
      { label: "การแจ้งเตือน", href: "/notifications", icon: "🔔" },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // หน้าแรกและหน้า Items มี Navigation เดิมของตัวเอง
  // จึงซ่อน Navbar กลางเพื่อไม่ให้เมนูซ้อนกัน
  if (pathname === "/" || pathname === "/items") {
    return null;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#EDE5F4] bg-[#FFFAF7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="shrink-0 text-2xl font-extrabold tracking-tight text-[#493D55]"
        >
          Findly<span className="text-[#8D6CE5]">.</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {menuGroups.map((group) => (
            <div key={group.title} className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#493D55] transition hover:bg-[#F0E9FF] hover:text-[#8D6CE5]"
              >
                {group.title}
                <span className="ml-1 text-xs">▾</span>
              </button>

              <div className="invisible absolute left-0 top-full z-50 mt-1 w-64 translate-y-1 rounded-2xl border border-[#EDE5F4] bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive(item.href)
                        ? "bg-[#F0E9FF] font-bold text-[#8D6CE5]"
                        : "text-[#493D55] hover:bg-[#FFFAF7]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>

                    {isActive(item.href) && (
                      <span className="ml-auto text-xs">●</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Login / Signup */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[#493D55] transition hover:bg-[#F0E9FF]"
          >
            เข้าสู่ระบบ
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-[#B9A0F8] px-4 py-2 text-sm font-bold text-[#493D55] transition hover:bg-[#A88AEF]"
          >
            สมัครสมาชิก
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-xl border border-[#EDE5F4] bg-white px-3 py-2 text-xl text-[#493D55] lg:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="max-h-[75vh] overflow-y-auto border-t border-[#EDE5F4] bg-white px-4 py-4 lg:hidden">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-[#8B7D94]">
                {group.title}
              </h2>

              <div className="grid gap-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`rounded-xl px-3 py-3 text-sm ${
                      isActive(item.href)
                        ? "bg-[#F0E9FF] font-bold text-[#8D6CE5]"
                        : "text-[#493D55] hover:bg-[#FFFAF7]"
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2 border-t border-[#EDE5F4] pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl border border-[#EDE5F4] px-3 py-3 text-center text-sm font-semibold"
            >
              เข้าสู่ระบบ
            </Link>

            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl bg-[#B9A0F8] px-3 py-3 text-center text-sm font-bold"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}