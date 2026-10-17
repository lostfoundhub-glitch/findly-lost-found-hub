"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const quickLinks = [
  { label: "ค้นหาสิ่งของ", href: "/items", icon: "🔎", description: "ค้นหารายการของหายและของที่พบ" },
  { label: "แจ้งของหาย / พบของ", href: "/report", icon: "📝", description: "แจ้งข้อมูลสิ่งของเข้าสู่ระบบ" },
  { label: "Smart Match", href: "/clue-matching", icon: "🎯", description: "ค้นหารายการที่อาจตรงกัน" },
  { label: "ติดตามสถานะ", href: "/tracking", icon: "📍", description: "ตรวจสอบความคืบหน้าของสิ่งของ" },
  { label: "ยืนยันความเป็นเจ้าของ", href: "/verification", icon: "🛡️", description: "ดำเนินการยืนยันสิทธิ์รับคืน" },
  { label: "นัดหมายรับคืน", href: "/scheduling", icon: "📅", description: "จัดการนัดหมายรับสิ่งของคืน" },
  { label: "Marketplace", href: "/marketplace", icon: "🛍️", description: "ดูรายการสินค้ามือสอง" },
  { label: "Hub Points & Rewards", href: "/rewards", icon: "🎁", description: "สะสมแต้มและแลกรางวัล" },
];

const categories = [
  {
    emoji: "🎒",
    name: "กระเป๋า",
    description: "เป้ กระเป๋าสะพาย กระเป๋าสตางค์",
    color: "category-pink",
    rotate: "-rotate-6",
  },
  {
    emoji: "📱",
    name: "อุปกรณ์อิเล็กทรอนิกส์",
    description: "มือถือ แท็บเล็ต หูฟัง และอื่น ๆ",
    color: "category-blue",
    rotate: "rotate-6",
  },
  {
    emoji: "🔑",
    name: "กุญแจ",
    description: "กุญแจบ้าน กุญแจรถ พวงกุญแจ",
    color: "category-yellow",
    rotate: "-rotate-3",
  },
  {
    emoji: "🪪",
    name: "บัตรนักศึกษา",
    description: "บัตรประจำตัวและบัตรสำคัญ",
    color: "category-purple",
    rotate: "rotate-3",
  },
  {
    emoji: "🚗",
    name: "ยานพาหนะ",
    description: "จักรยาน รถจักรยานยนต์ และอื่น ๆ",
    color: "category-mint",
    rotate: "-rotate-3",
  },
  {
    emoji: "🐱",
    name: "สัตว์เลี้ยง",
    description: "ช่วยตามหาเพื่อนตัวน้อย",
    color: "category-peach",
    rotate: "rotate-3",
  },
];

const recentItems = [
  {
    emoji: "🎒",
    name: "กระเป๋าผ้าใบสีครีม",
    category: "กระเป๋า",
    location: "อาคารเรียนรวม",
    date: "12 ต.ค. 2569",
    color: "item-pink",
    status: "กำลังตามหา",
    statusColor: "status-pink",
  },
  {
    emoji: "🎧",
    name: "หูฟังไร้สายสีขาว",
    category: "อุปกรณ์การเรียน",
    location: "ห้องสมุด",
    date: "13 ต.ค. 2569",
    color: "item-blue",
    status: "พบของแล้ว",
    statusColor: "status-mint",
  },
  {
    emoji: "🧸",
    name: "ตุ๊กตาหมีตัวเล็ก",
    category: "ของที่พบ",
    location: "โรงอาหาร",
    date: "13 ต.ค. 2569",
    color: "item-yellow",
    status: "รอเจ้าของ",
    statusColor: "status-yellow",
  },
];

const floatingDecorations = [
  { emoji: "🎒", className: "float-bag" },
  { emoji: "🎧", className: "float-headphones" },
  { emoji: "🔑", className: "float-keys" },
  { emoji: "🧸", className: "float-bear" },
];

function HomeAuthButtons() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      const loggedIn = !error && Boolean(data.user);
      setIsLoggedIn(loggedIn);
      setIsLoading(false);

      if (loggedIn && data.user) {
        const { count, error: countError } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", data.user.id)
          .eq("is_read", false);

        if (mounted && !countError) {
          setUnreadCount(count ?? 0);
        }
      } else {
        setUnreadCount(0);
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (error) {
      alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-2">
      {!isLoading && isLoggedIn && (
        <Link
          href="/notifications"
          aria-label={`การแจ้งเตือนที่ยังไม่ได้อ่าน ${unreadCount} รายการ`}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8DFFF] bg-white text-xl transition hover:bg-[#F3EDFF]"
        >
          🔔

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      )}

      {isLoading ? (
        <span className="rounded-full bg-[#F3EDFF] px-4 py-2.5 text-sm font-semibold text-[#817493]">
          กำลังตรวจสอบ...
        </span>
      ) : isLoggedIn ? (
        <>
          <span className="hidden rounded-full bg-[#E4F7EC] px-4 py-2.5 text-sm font-bold text-[#559B78] sm:inline-flex">
            ✓ เข้าสู่ระบบแล้ว
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center rounded-full border border-[#E8DFFF] bg-white/70 px-4 py-2.5 text-sm font-bold text-[#817493] transition-all duration-200 hover:border-[#CBB8FA] hover:bg-[#F8F5FF] hover:text-[#8B6CE0] disabled:opacity-60"
          >
            {isSigningOut ? "กำลังออก..." : "ออกจากระบบ"}
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="hidden items-center rounded-full border border-[#E8DFFF] bg-white/70 px-5 py-2.5 text-sm font-bold text-[#817493] transition-all duration-200 hover:border-[#CBB8FA] hover:bg-[#F8F5FF] hover:text-[#8B6CE0] sm:inline-flex"
          >
            เข้าสู่ระบบ
          </Link>

          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full border border-white/60 bg-gradient-to-r from-[#B9A0F8] to-[#A58AEF] px-6 py-3 text-sm font-bold text-white shadow-[0_5px_15px_rgba(165,138,239,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(165,138,239,0.35)] active:translate-y-0"
          >
            สมัครใช้งาน
          </Link>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FFFCF7] text-[#49376F]">
      {/* Navigation */}
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/80 bg-white/85 px-5 py-3 shadow-[0_8px_35px_rgba(116,88,157,0.09)] backdrop-blur-xl sm:px-8">
         <a href="#" className="flex items-center gap-2">
  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B9A0F8] text-xl shadow-sm">
    🔎
  </span>

  <div className="flex flex-col">
    <span className="text-xl font-black leading-tight">
      findly<span className="text-[#B9A0F8]">.</span>
    </span>

    <span className="text-[9px] font-bold tracking-[2px] text-[#9B8AAF]">
      LOST & FOUND HUB
    </span>
  </div>
</a>

          <div className="hidden items-center gap-2 text-sm font-semibold text-[#817493] md:flex">
            <a
              href="#categories"
              className="rounded-full px-4 py-2.5 transition-all duration-200 hover:bg-[#F3EDFF] hover:text-[#8B6CE0]"
            >
              หมวดหมู่
            </a>
            <a
              href="#recent"
              className="rounded-full px-4 py-2.5 transition-all duration-200 hover:bg-[#F3EDFF] hover:text-[#8B6CE0]"
            >
              รายการล่าสุด
            </a>
         
            <a
              href="#how-it-works"
              className="rounded-full px-4 py-2.5 transition-all duration-200 hover:bg-[#F3EDFF] hover:text-[#8B6CE0]"
            >
              วิธีใช้งาน
            </a>
          </div>

          <HomeAuthButtons />
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="hero-blob hero-blob-purple" />
        <div className="hero-blob hero-blob-pink" />

        <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#E8DDFD] bg-white px-4 py-2 text-sm font-bold text-[#8E70D4] shadow-sm">
              <span className="animate-twinkle">✦</span>
              Your little lost & found corner
              <span>💌</span>
            </div>

            <h1 className="max-w-2xl text-5xl font-black leading-[1.17] tracking-tight sm:text-6xl lg:text-7xl">
              สิ่งของที่หายไป
              <br />
              <span className="relative inline-block text-[#A58AEF]">
                อาจอยู่ใกล้กว่าที่คิด
                <span className="hero-underline" />
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-8 text-[#887C98] sm:text-lg">
              พื้นที่เล็ก ๆ ที่วยพาของที่พบให้กลับไปหาเจ้าของอีกครั้ง
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
               href="/report"
                className="group inline-flex items-center gap-3 rounded-full bg-[#B9A0F8] px-7 py-4 font-bold text-white shadow-[0_6px_0_#9C7DDF] transition hover:-translate-y-1 hover:shadow-[0_9px_0_#9C7DDF] active:translate-y-1 active:shadow-none"
              >
               ＋ แจ้งของหาย / พบของ
                <span className="transition group-hover:translate-x-1">→</span>
              </a>

              <a
                href="/items/general/clue"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#E7DDF9] bg-white px-7 py-4 font-bold text-[#8068B4] transition hover:border-[#B9A0F8] hover:bg-[#F7F2FF]"
              >
                แจ้งเบาะแส
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-[#988BA8]">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DDF5E8] text-xs">
                  ✓
                </span>
                ใช้งานง่าย
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FBE1ED] text-xs">
                  ♡
                </span>
                ช่วยเหลือกัน
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF0C4] text-xs">
                  ✦
                </span>
                ตามหาอย่างมีหวัง
              </span>
            </div>
          </div>

          {/* Floating illustrations */}
          <div className="hero-art relative mx-auto flex h-[350px] w-full max-w-[510px] items-center justify-center sm:h-[440px]">
            <div className="hero-art-circle absolute h-[280px] w-[280px] rounded-full bg-[#EEE6FF] sm:h-[360px] sm:w-[360px]" />
            <div className="hero-art-circle-secondary absolute h-[220px] w-[220px] rounded-full bg-[#FDE5EF] sm:h-[285px] sm:w-[285px]" />
           

            <div className="absolute left-[12%] top-[13%] animate-twinkle text-3xl text-[#A58AEF]">
              ✦
            </div>
            <div className="absolute right-[12%] top-[17%] animate-twinkle text-2xl text-[#F1B7CD]">
              ✧
            </div>
            <div className="absolute bottom-[14%] left-[16%] animate-twinkle text-2xl text-[#E8C55F]">
              ✨
            </div>
            <div className="absolute bottom-[19%] right-[15%] animate-twinkle text-3xl text-[#A58AEF]">
              ♡
            </div>

           <div className="float-card float-bag absolute left-[4%] top-[15%] h-24 w-24 rotate-[-10deg] overflow-hidden rounded-[30px] border-4 border-white bg-[#F9CFE0] shadow-[0_15px_35px_rgba(119,85,160,0.13)] sm:h-28 sm:w-28">
  <img
   src="/images/bagpack.webp"
    alt="กระเป๋าที่กำลังตามหา"
    className="h-full w-full object-cover"
  />
</div>

            <div className="float-card float-headphones absolute right-[3%] top-[23%] flex h-20 w-20 rotate-[10deg] items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-[#CDE8FC] text-4xl shadow-[0_15px_35px_rgba(119,85,160,0.13)] sm:h-24 sm:w-24 sm:text-5xl">
  <img
    src="/images/earphone.avif"
    alt="หูฟัง"
    className="h-full w-full object-cover"
  />
</div>

            <div className="float-card float-bear absolute bottom-[18%] right-[7%] flex h-20 w-20 rotate-[8deg] items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-[#FFE9AE] text-4xl shadow-[0_15px_35px_rgba(119,85,160,0.13)] sm:h-24 sm:w-24 sm:text-5xl">
  <img
   src="/images/teddy.webp"
    alt="ตุ๊กตาหมีที่กำลังตามหา"
    className="h-full w-full object-cover"
  />
</div>

            <div className="float-card float-keys absolute bottom-[14%] left-[12%] flex h-[76px] w-[76px] rotate-[-8deg] items-center justify-center overflow-hidden rounded-[25px] border-4 border-white bg-[#D5F2E2] shadow-[0_15px_35px_rgba(119,85,160,0.13)] sm:h-24 sm:w-24">
  <img
    src="/images/bike.avif"
    alt="จักรยานที่กำลังตามหา"
    className="h-full w-full object-cover"
  />
</div>

           <div className="relative magnifying-glass-bounce z-10 flex h-40 w-40 items-center justify-center rounded-[48px] border-[8px] border-white bg-gradient-to-br from-[#D9C9FF] to-[#B9A0F8] text-8xl shadow-[0_25px_60px_rgba(119,85,160,0.22)] sm:h-52 sm:w-52 sm:rounded-[60px] sm:text-9xl">
              🔎
              <span className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#FFE49A] text-xl shadow-md sm:h-14 sm:w-14 sm:text-2xl">
                ♡
              </span>
            </div>

            <div className="absolute bottom-[4%] right-[24%] rounded-2xl border border-white bg-white/90 px-4 py-3 text-sm font-bold text-[#8068B4] shadow-lg backdrop-blur-sm sm:right-[25%]">
              <span className="mr-2">💌</span>
              มีความหวังเสมอ!
            </div>
          </div>
        </div>

      </section>

      {/* Findly Quick Access */}
      <section
        aria-labelledby="quick-access-title"
        className="bg-white/70 px-5 py-12 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <span className="mb-3 inline-flex rounded-full bg-[#F0E9FF] px-4 py-2 text-xs font-bold tracking-wider text-[#7457B7]">
              FINDLY QUICK ACCESS
            </span>
            <h2
              id="quick-access-title"
              className="text-2xl font-extrabold text-[#49376F] sm:text-3xl"
            >
              เมนูลัด Findly
            </h2>
            <p className="mt-3 text-sm text-gray-500 sm:text-base">
              เลือกฟังก์ชันที่ต้องการได้ทันที ไม่ต้องค้นหาเมนู
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-[170px] flex-col items-center justify-center rounded-3xl border border-[#EEE6FA] bg-white p-4 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#CBB8FA] hover:bg-[#FBF9FF] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A58AEF]"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0E9FF] text-3xl transition group-hover:scale-110"
                >
                  {item.icon}
                </span>
                <span className="text-sm font-extrabold leading-5 text-[#49376F] sm:text-base">
                  {item.label}
                </span>
                <span className="mt-2 text-xs leading-5 text-gray-500">
                  {item.description}
                </span>
                <span className="mt-3 text-xs font-bold text-[#9479D7]">
                  เปิดเมนู →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="scroll-mt-28 bg-[#F7F2FF] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#9479D7] shadow-sm">
                <span>🌷</span> A LITTLE HELP GOES A LONG WAY
              </div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                กำลังตามหาอะไรอยู่น้า?
              </h2>
              <p className="mt-3 text-[#8C809E]">
                เลือกหมวดหมู่เพื่อเริ่มต้นตามหาสิ่งสำคัญของคุณ
              </p>
            </div>

            <a
              href="/items"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E7DDF9] bg-white px-5 py-3 text-sm font-bold text-[#8068B4] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              ดูทั้งหมด <span>→</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => (
              <a
                key={category.name}
                href={`/items?category=${encodeURIComponent(category.name)}`}
                className={`category-card ${index % 2 === 0 ? "category-card-delay-a" : "category-card-delay-b"} group rounded-[28px] border border-white p-4 shadow-[0_5px_20px_rgba(116,88,157,0.04)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(116,88,157,0.12)] sm:rounded-[32px] sm:p-5`}
              >
                <div className={`mb-5 flex aspect-square items-center justify-center rounded-[24px] text-5xl transition duration-300 group-hover:rotate-6 group-hover:scale-110 ${category.color}`}>
                  <span className={category.rotate}>{category.emoji}</span>
                </div>
                <h3 className="text-base font-black sm:text-lg">
                  {category.name}
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#91859F] sm:text-sm">
                  {category.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#A28AE0]">
                  <span>เลือกหมวดหมู่</span>
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Recent items */}
      <section id="recent" className="scroll-mt-28 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E4F7EC] px-4 py-2 text-sm font-bold text-[#559B78]">
                <span className="animate-twinkle">✦</span> LITTLE CLUES, BIG HOPE
              </div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                เบาะแสล่าสุด 💌
              </h2>
              <p className="mt-3 text-[#8C809E]">
                ลองดูรายการล่าสุด เผื่อสิ่งที่คุณตามหาอยู่ที่นี่ก็ได้นะ
              </p>
            </div>

            <a
              href="/items"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EDE5FF] px-5 py-3 text-sm font-bold text-[#8068B4] transition hover:bg-[#DFD2FF]"
            >
              ดูรายการทั้งหมด <span>→</span>
            </a>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recentItems.map((item) => (
              <article
                key={item.name}
                className="group overflow-hidden rounded-[32px] border border-[#F0EAF7] bg-white p-3 shadow-[0_8px_30px_rgba(116,88,157,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(116,88,157,0.12)]"
              >
                <div className={`relative flex h-52 items-center justify-center overflow-hidden rounded-[25px] ${item.color}`}>
                  <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[18px] border-white/30" />
                  <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full border-[18px] border-white/30" />
                  <span className="relative text-8xl transition duration-300 group-hover:scale-110 group-hover:rotate-3">
                    {item.emoji}
                  </span>
                  <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#8068B4] backdrop-blur-sm">
                    {item.category}
                  </span>
                </div>

                <div className="px-3 pb-3 pt-5">
                  <h3 className="text-lg font-black">{item.name}</h3>
                  <div className="mt-3 space-y-2 text-sm text-[#91859F]">
                    <p className="flex items-center gap-2">
                      <span></span> {item.location}
                    </p>
                    <p className="flex items-center gap-2">
                      <span></span> {item.date}
                    </p>
                  </div>

                  <a
                    href="/items"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F5F0FF] px-4 py-3 font-bold text-[#8068B4] transition hover:bg-[#E9DEFF]"
                  >
                    ดูรายละเอียด <span>→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-[#A296B1]">
              ยังไม่เจอสิ่งที่ตามหาเหรอ? อย่าเพิ่งหมดหวังนะ 🥺
            </p>
            

          </div>
        </div>
      </section>

                   {/* Advertisement Section */}
      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold tracking-[2px] text-[#A296B1]">
              SPONSORED
            </span>
            <span className="rounded-full bg-[#F3EDFF] px-3 py-1 text-[10px] font-bold text-[#8D79B0]">
              โฆษณา
            </span>
          </div>

          <a
            href="https://unsplash.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="home-ad-card group grid overflow-hidden rounded-[28px] border border-[#F0EAF7] bg-white sm:rounded-[36px] md:grid-cols-2"
          >
            <div className="relative min-h-[250px] overflow-hidden bg-[#F6EDE3] sm:min-h-[320px]">
              <img
                src="https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=85"
                alt="กาแฟเย็นจากคาเฟ่"
                className="home-ad-image absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#49376F] shadow-sm backdrop-blur">
                COFFEE & CAFE
              </span>
            </div>

            <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#FFF9F2] via-[#FFF5F8] to-[#F5EFFF] p-7 sm:p-10 lg:p-12">
              <div className="home-ad-orb pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#E8D5C1]/30 blur-3xl" />
<div className="home-ad-orb home-ad-orb-secondary pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#F3D7E7]/40 blur-3xl" />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[3px] text-[#A57956]">
                  YOUR DAILY COFFEE
                </p>

                <h2 className="mt-4 text-3xl font-black leading-tight text-[#49376F] sm:text-4xl">
                  เติมความสดชื่น
                  <br />
                  <span className="text-[#B58B68]">
                    ให้ทุกวันเป็นวันพิเศษ
                  </span>
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-[#91859F] sm:text-base">
                  กาแฟแก้วโปรดกับช่วงเวลาพักผ่อน
                  ที่ช่วยเติมพลังให้พร้อมไปต่อในทุกวัน
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <span className="text-sm text-[#91859F]">
                    เมนูแนะนำ
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[#D2C2E8]" />
                  <span className="text-sm font-bold text-[#A57956]">
                    Coffee Time
                  </span>
                </div>

                <div className="home-ad-button mt-7 inline-flex items-center gap-3 rounded-full bg-[#49376F] px-6 py-3.5 text-sm font-bold text-white">
                  สำรวจเพิ่มเติม
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <p className="mt-5 text-[10px] text-[#B2A5B9]">
                  ตัวอย่างพื้นที่โฆษณา · ภาพประกอบจาก Unsplash
                </p>
              </div>
            </div>
          </a>
        </div>
      </section>
                   
      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-28 px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#EDE6FF] p-7 sm:rounded-[48px] sm:p-12 lg:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#9479D7]">
                🪄 SIMPLE & HEARTWARMING
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                เรื่องเล็ก ๆ
                <br />
                ที่ช่วยให้เจอกันอีกครั้ง
                <span className="ml-2">💜</span>
              </h2>
              <p className="mt-4 max-w-md leading-7 text-[#837397]">
                ไม่ว่าจะเป็นของสำคัญที่ทำหาย หรือของที่คุณเก็บได้
                ทุกเบาะแสอาจช่วยให้สิ่งของกลับไปอยู่กับเจ้าของที่แท้จริง
              </p>
              <a
                href="/report"
                className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#49376F] px-6 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-[#5C4785]"
              >
                เริ่มต้นช่วยกันตามหา <span>♡</span>
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] bg-white p-5 transition hover:-translate-y-1">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBE1ED] text-3xl">
                  📝
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#B09BCF]">
                  STEP 01
                </p>
                <h3 className="mt-2 font-black">ลงประกาศ</h3>
                <p className="mt-2 text-sm leading-6 text-[#91859F]">
                  บอกรายละเอียดสิ่งของที่หายหรือพบ
                </p>
              </div>

              <a
  href="/items"
  className="group block rounded-[28px] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:translate-y-5"
>
  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3DAFF] text-3xl transition duration-300 group-hover:scale-110">
    🔎
  </div>

  <p className="text-xs font-bold uppercase tracking-widest text-[#B09BCF]">
    STEP 02
  </p>

  <h3 className="mt-2 font-black">หาเบาะแส</h3>

  <p className="mt-2 text-sm leading-6 text-[#91859F]">
    สำรวจรายการที่อาจตรงกับสิ่งของ
  </p>

  <p className="mt-4 text-sm font-bold text-[#9479D7]">
    สำรวจรายการสิ่งของ →
  </p>
</a>

              <div className="rounded-[28px] bg-white p-5 transition hover:-translate-y-1">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF5E8] text-3xl">
                  🫶
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#B09BCF]">
                  STEP 03
                </p>
                <h3 className="mt-2 font-black">รับคืนอย่างปลอดภัย</h3>
                <p className="mt-2 text-sm leading-6 text-[#91859F]">
                  ตรวจสอบข้อมูลและนัดรับคืน
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* Footer */}
      <footer className="border-t border-[#F0EAF7] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <a href="#" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDE5FF] text-lg">
              🔎
            </span>
            <span className="text-xl font-black">
              findly<span className="text-[#B9A0F8]">.</span>
            </span>
          </a>

          <p className="text-center text-xs text-[#A296B1] sm:text-sm">
            Made with ♡ to help lost things find their way home.
          </p>

          <a
            href="#"
            className="text-sm font-bold text-[#8D79B0] transition hover:text-[#A58AEF]"
          >
            กลับขึ้นด้านบน ↑
          </a>
        </div>
      </footer>
    </main>
  );
}