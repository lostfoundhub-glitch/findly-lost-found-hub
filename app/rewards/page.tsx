"use client";

import { useEffect, useState } from "react";

type PointHistory = {
  id: string;
  title: string;
  description: string;
  points: number;
  date: string;
  type: "earn" | "redeem";
};

type Reward = {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  stock: number;
};

type Redemption = {
  id: string;
  rewardName: string;
  points: number;
  date: string;
};

const POINTS_KEY = "findly_points";
const HISTORY_KEY = "findly_points_history";
const REDEMPTIONS_KEY = "findly_redemptions";

const INITIAL_REWARDS: Reward[] = [
  {
    id: "reward-1",
    name: "คูปองส่วนลด 20 บาท",
    description: "ใช้เป็นส่วนลดเมื่อซื้อสินค้าจากร้านค้าที่ร่วมรายการ",
    points: 100,
    icon: "🎟️",
    stock: 50,
  },
  {
    id: "reward-2",
    name: "คูปองเครื่องดื่ม",
    description: "แลกรับส่วนลดเครื่องดื่มจากร้านค้าที่ร่วมรายการ",
    points: 150,
    icon: "☕",
    stock: 30,
  },
  {
    id: "reward-3",
    name: "คูปองส่วนลด 50 บาท",
    description: "ใช้เป็นส่วนลดสำหรับสินค้าที่ร่วมรายการ",
    points: 250,
    icon: "🎁",
    stock: 20,
  },
  {
    id: "reward-4",
    name: "คูปองพิเศษสำหรับสมาชิก",
    description: "รางวัลพิเศษสำหรับผู้ใช้ที่สะสมแต้มตามเงื่อนไข",
    points: 400,
    icon: "💜",
    stock: 10,
  },
];

function readNumber(key: string, fallback: number): number {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RewardsPage() {
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [activeTab, setActiveTab] = useState<"rewards" | "history">(
    "rewards"
  );
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPoints(readNumber(POINTS_KEY, 0));
    setHistory(readArray<PointHistory>(HISTORY_KEY));
    setRedemptions(readArray<Redemption>(REDEMPTIONS_KEY));
    setLoaded(true);
  }, []);

  function showMessage(
    text: string,
    type: "success" | "error" = "success"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function redeemReward(reward: Reward) {
    setMessage("");

    if (points < reward.points) {
      showMessage(
        `แต้มของคุณไม่เพียงพอ ต้องมี ${reward.points.toLocaleString(
          "th-TH"
        )} แต้ม`,
        "error"
      );
      return;
    }

    if (reward.stock <= 0) {
      showMessage("ขออภัย รางวัลนี้หมดแล้ว", "error");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันการแลก "${reward.name}" ใช้ ${reward.points} แต้มใช่หรือไม่?`
    );

    if (!confirmed) return;

    const newPoints = points - reward.points;
    const now = new Date().toISOString();

    const newHistoryItem: PointHistory = {
      id: `history-${Date.now()}`,
      title: `แลกรางวัล: ${reward.name}`,
      description: `ใช้ ${reward.points} แต้มในการแลกรางวัล`,
      points: -reward.points,
      date: now,
      type: "redeem",
    };

    const newRedemption: Redemption = {
      id: `redemption-${Date.now()}`,
      rewardName: reward.name,
      points: reward.points,
      date: now,
    };

    const newHistory = [newHistoryItem, ...history];
    const newRedemptions = [newRedemption, ...redemptions];

    try {
      localStorage.setItem(POINTS_KEY, String(newPoints));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      localStorage.setItem(
        REDEMPTIONS_KEY,
        JSON.stringify(newRedemptions)
      );

      setPoints(newPoints);
      setHistory(newHistory);
      setRedemptions(newRedemptions);

      showMessage(`แลก "${reward.name}" สำเร็จแล้ว!`, "success");
    } catch {
      showMessage(
        "ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์",
        "error"
      );
    }
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#FFFAF7] p-8 text-center text-[#493D55]">
        กำลังโหลดข้อมูล...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] px-4 py-8 text-[#493D55] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-wide text-[#9B83D4]">
            FINDLY • POINTS & REWARDS
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            แต้มสะสมและรางวัล 🎁
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B7D94] sm:text-base">
            สะสมแต้มจากการมีส่วนร่วมกับ Findly และนำแต้มมาแลกรับรางวัลที่คุณชื่นชอบ
          </p>
        </header>

        {/* Points Summary */}
        <section className="mb-8 rounded-3xl bg-gradient-to-r from-[#B9A0F8] to-[#D8C8FF] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-[#493D55]/80">
                แต้มสะสมของคุณ
              </p>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-[#493D55] sm:text-6xl">
                  {points.toLocaleString("th-TH")}
                </span>
                <span className="font-semibold text-[#493D55]/80">
                  คะแนน
                </span>
              </div>

              <p className="mt-3 text-sm text-[#493D55]/75">
                ใช้แต้มแลกรางวัลที่เหมาะกับคุณได้เลย
              </p>
            </div>

            <div className="self-start rounded-2xl bg-white/50 p-5 text-5xl sm:self-center">
              ⭐
            </div>
          </div>
        </section>

        {/* Message */}
        {message && (
          <div
            role="status"
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{message}</p>
              <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="ปิดข้อความ"
                className="font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-3 border-b border-[#EDE5F4]">
          <button
            type="button"
            onClick={() => setActiveTab("rewards")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "rewards"
                ? "border-[#9B83D4] text-[#7C62B8]"
                : "border-transparent text-[#8B7D94] hover:text-[#493D55]"
            }`}
          >
            🎁 รายการรางวัล
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === "history"
                ? "border-[#9B83D4] text-[#7C62B8]"
                : "border-transparent text-[#8B7D94] hover:text-[#493D55]"
            }`}
          >
            📜 ประวัติแต้ม
          </button>
        </div>

        {/* Rewards */}
        {activeTab === "rewards" && (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold">เลือกของรางวัล</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                แต้มที่ต้องใช้จะแสดงอยู่ในการ์ดของรางวัลแต่ละรายการ
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rewards.map((reward) => {
                const canRedeem =
                  points >= reward.points && reward.stock > 0;

                return (
                  <article
                    key={reward.id}
                    className="flex flex-col rounded-3xl border border-[#EEE6F5] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-[#F5F0FF] text-5xl">
                      {reward.icon}
                    </div>

                    <h3 className="font-bold">{reward.name}</h3>

                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#8B7D94]">
                      {reward.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="font-bold text-[#8B6DD1]">
                        ⭐ {reward.points.toLocaleString("th-TH")} แต้ม
                      </span>

                      <span className="text-xs text-[#8B7D94]">
                        เหลือ {reward.stock}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => redeemReward(reward)}
                      disabled={!canRedeem}
                      className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        canRedeem
                          ? "bg-[#B9A0F8] text-[#493D55] hover:bg-[#A98CEB]"
                          : "cursor-not-allowed bg-gray-100 text-gray-400"
                      }`}
                    >
                      {reward.stock <= 0
                        ? "สินค้าหมด"
                        : points < reward.points
                          ? "แต้มไม่เพียงพอ"
                          : "แลกรางวัล"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* History */}
        {activeTab === "history" && (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold">ประวัติการใช้แต้ม</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                ตรวจสอบรายการแลกรางวัลและการเปลี่ยนแปลงคะแนนของคุณ
              </p>
            </div>

            {history.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
                <div className="mb-3 text-4xl">📜</div>
                <h3 className="font-bold">ยังไม่มีประวัติแต้ม</h3>
                <p className="mt-2 text-sm text-[#8B7D94]">
                  เมื่อมีการรับหรือใช้แต้ม รายการจะแสดงที่นี่
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-[#EEE6F5] bg-white">
                <div className="divide-y divide-[#F0EAF5]">
                  {history.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F0FF] text-xl">
                          {item.type === "earn" ? "⭐" : "🎁"}
                        </div>

                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="mt-1 text-sm text-[#8B7D94]">
                            {item.description}
                          </p>
                          <p className="mt-1 text-xs text-[#A79BAF]">
                            {formatDate(item.date)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`whitespace-nowrap text-lg font-bold ${
                          item.points >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {item.points > 0 ? "+" : ""}
                        {item.points.toLocaleString("th-TH")} แต้ม
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {redemptions.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-xl font-bold">
                  🎁 รายการแลกรางวัลของฉัน
                </h2>

                <div className="space-y-3">
                  {redemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex flex-col justify-between gap-2 rounded-2xl border border-[#EEE6F5] bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">
                          {redemption.rewardName}
                        </p>
                        <p className="mt-1 text-xs text-[#8B7D94]">
                          {formatDate(redemption.date)}
                        </p>
                      </div>

                      <span className="font-bold text-[#8B6DD1]">
                        {redemption.points.toLocaleString("th-TH")} แต้ม
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Note */}
        <div className="mt-10 rounded-2xl border border-[#E8DDFB] bg-[#F5F0FF] p-5">
          <h3 className="font-bold">💡 หมายเหตุ</h3>
          <p className="mt-2 text-sm leading-6 text-[#756581]">
            ขณะนี้ระบบใช้ข้อมูลตัวอย่างและบันทึกข้อมูลไว้ในเบราว์เซอร์
            แต้มจะยังไม่เชื่อมโยงกับบัญชีผู้ใช้หรือการแจ้งของหายจริง
            และรายการรางวัลยังเป็นข้อมูลตัวอย่าง
            เราจะเชื่อมโยงระบบเหล่านี้ในขั้นตอนการทำฐานข้อมูลภายหลัง
          </p>
        </div>
      </div>
    </main>
  );
}