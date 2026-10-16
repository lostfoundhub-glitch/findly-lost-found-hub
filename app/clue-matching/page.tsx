"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LostReport = {
  id: string;
  type?: string;
  name?: string;
  itemName?: string;
  title?: string;
  category?: string;
  color?: string;
  location?: string;
  date?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
};

type MarketplaceItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  condition: string;
  description: string;
  location: string;
  seller: string;
  imageUrl: string;
  createdAt: string;
};

type MatchResult = {
  item: MarketplaceItem;
  score: number;
  reasons: string[];
};

const REPORTS_KEY = "findly_reports";
const MARKETPLACE_KEY = "findly_marketplace_items";

const BG = "#FFFAF7";
const PURPLE = "#B9A0F8";
const DARK = "#493D55";
const MUTED = "#8B7D94";

const inputClass =
  "w-full rounded-xl border border-[#E4D9F0] bg-white px-4 py-3 text-sm text-[#493D55] outline-none transition focus:border-[#B9A0F8] focus:ring-2 focus:ring-[#B9A0F8]/20";

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

function getReportName(report: LostReport): string {
  return report.itemName || report.title || report.name || "";
}

function isLostReport(report: LostReport): boolean {
  const type = (report.type || "").toLowerCase();

  // ถ้าไม่มีประเภท จะไม่เดาว่าเป็นประกาศของหาย
  return type.includes("lost") || type.includes("หาย");
}

function normalizeText(value?: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getWords(value?: string): string[] {
  const normalized = normalizeText(value);

  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function textSimilarity(a?: string, b?: string): number {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) return 0;
  if (first === second) return 1;

  // ตรวจข้อความที่มีอยู่ในอีกข้อความหนึ่ง
  if (first.length >= 4 && second.includes(first)) return 0.85;
  if (second.length >= 4 && first.includes(second)) return 0.85;

  const firstWords = new Set(getWords(first));
  const secondWords = new Set(getWords(second));

  if (firstWords.size === 0 || secondWords.size === 0) return 0;

  let common = 0;

  firstWords.forEach((word) => {
    if (secondWords.has(word)) common++;
  });

  return common / Math.max(firstWords.size, secondWords.size);
}

function calculateMatch(
  report: LostReport,
  item: MarketplaceItem
): MatchResult {
  const reasons: string[] = [];

  const reportName = getReportName(report);
  const itemName = item.name || "";

  const nameScore = textSimilarity(reportName, itemName);

  const categoryScore = textSimilarity(
    report.category,
    item.category
  );

  const reportColor = normalizeText(report.color);
  const itemText = normalizeText(
    `${item.name} ${item.description}`
  );

  const colorWords = getWords(reportColor);

  const colorMatched =
    colorWords.length > 0 &&
    colorWords.some((word) => itemText.includes(word));

  const descriptionScore = textSimilarity(
    report.description,
    `${item.name} ${item.description}`
  );

  // คะแนนจากชื่อ 50%, หมวดหมู่ 25%, สี 15%, รายละเอียด 10%
  const score = Math.round(
    nameScore * 50 +
      categoryScore * 25 +
      (colorMatched ? 15 : 0) +
      descriptionScore * 10
  );

  if (nameScore >= 0.4) {
    reasons.push("ชื่อสิ่งของมีคำที่คล้ายกัน");
  }

  if (categoryScore >= 0.5) {
    reasons.push("หมวดหมู่มีความคล้ายกัน");
  }

  if (colorMatched) {
    reasons.push(`พบคำเกี่ยวกับสี "${report.color}" ในรายละเอียดสินค้า`);
  }

  if (descriptionScore >= 0.3) {
    reasons.push("รายละเอียดบางส่วนมีคำที่ตรงกัน");
  }

  if (reasons.length === 0) {
    reasons.push("คะแนนเกิดจากการเปรียบเทียบข้อมูลที่มี");
  }

  return {
    item,
    score: Math.min(score, 100),
    reasons,
  };
}

function formatDate(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString("th-TH")
    : "ไม่ระบุ";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "คล้ายกันมาก";
  if (score >= 40) return "อาจมีความเกี่ยวข้อง";
  return "คล้ายกันเล็กน้อย";
}

function getScoreStyle(score: number): string {
  if (score >= 70) return "bg-green-50 text-green-700";
  if (score >= 40) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export default function ClueMatchingPage() {
  const router = useRouter();

  const [reports, setReports] = useState<LostReport[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<
    MarketplaceItem[]
  >([]);

  const [selectedReportId, setSelectedReportId] = useState("");
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState("0");
  const [selectedMatch, setSelectedMatch] =
    useState<MatchResult | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadedReports = readArray<LostReport>(REPORTS_KEY);
    const loadedItems =
      readArray<MarketplaceItem>(MARKETPLACE_KEY);

    const lostReports = loadedReports.filter(isLostReport);

    setReports(lostReports);
    setMarketplaceItems(loadedItems);

    if (lostReports.length > 0) {
      setSelectedReportId(lostReports[0].id);
    }

    setLoaded(true);
  }, []);

  const selectedReport = reports.find(
    (report) => report.id === selectedReportId
  );

  const matches = useMemo(() => {
    if (!selectedReport) return [];

    const keyword = normalizeText(search);
    const minimum = Number(minimumScore);

    return marketplaceItems
      .map((item) => calculateMatch(selectedReport, item))
      .filter((match) => match.score >= minimum)
      .filter((match) => {
        if (!keyword) return true;

        const searchable = normalizeText(
          `${match.item.name} ${match.item.category} ${match.item.description} ${match.item.seller}`
        );

        return searchable.includes(keyword);
      })
      .sort((a, b) => b.score - a.score);
  }, [
    selectedReport,
    marketplaceItems,
    search,
    minimumScore,
  ]);

  function refreshData() {
    const loadedReports = readArray<LostReport>(REPORTS_KEY);
    const loadedItems =
      readArray<MarketplaceItem>(MARKETPLACE_KEY);

    const lostReports = loadedReports.filter(isLostReport);

    setReports(lostReports);
    setMarketplaceItems(loadedItems);
    setSelectedReportId((current) => {
      if (lostReports.some((report) => report.id === current)) {
        return current;
      }

      return lostReports[0]?.id || "";
    });
    setSelectedMatch(null);
    setNotice("โหลดข้อมูลล่าสุดจากเบราว์เซอร์แล้ว");
  }

  function openCluePage(item: MarketplaceItem) {
    try {
      sessionStorage.setItem(
        "findly_selected_marketplace_clue",
        JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          reportId: selectedReport?.id || "",
          reportName: selectedReport
            ? getReportName(selectedReport)
            : "",
        })
      );
    } catch {
      // การนำทางยังทำได้ แม้บันทึกข้อมูลชั่วคราวไม่ได้
    }

    router.push("/items/general/clue");
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFAF7] text-[#493D55]">
        กำลังค้นหาเบาะแส...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] px-4 py-8 text-[#493D55] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-wide text-[#8B6DD1]">
              FINDLY • LOST ITEM CLUE MATCHING
            </p>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              ค้นหาเบาะแสสิ่งของ 🔎
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B7D94] sm:text-base">
              เปรียบเทียบประกาศของหายกับสินค้าใน Marketplace
              เพื่อค้นหารายการที่อาจมีความเกี่ยวข้อง
            </p>
          </div>

          <button
            type="button"
            onClick={refreshData}
            className="rounded-xl border border-[#DCCFF0] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#F5F0FF]"
          >
            ↻ โหลดข้อมูลล่าสุด
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#DCCFF0] bg-[#F5F0FF] p-4 text-sm"
          >
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="ปิดข้อความ"
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Explanation */}
        <section className="mb-8 rounded-3xl border border-[#E8DDFB] bg-gradient-to-r from-[#F1E9FF] to-[#FFF0F5] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">
              💡
            </div>

            <div>
              <h2 className="font-bold">ระบบจับคู่ทำงานอย่างไร?</h2>
              <p className="mt-2 text-sm leading-6 text-[#756581]">
                ระบบเปรียบเทียบชื่อ หมวดหมู่ สี และรายละเอียดของสิ่งของ
                แล้วคำนวณคะแนนความคล้ายคลึงเพื่อจัดอันดับเบาะแส
                คะแนนสูงไม่ได้หมายความว่าเป็นของชิ้นเดียวกัน
                ผู้ใช้ควรตรวจสอบข้อมูลเพิ่มเติมก่อนดำเนินการใด ๆ
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">ประกาศของหาย</p>
            <p className="mt-2 text-3xl font-extrabold">
              {reports.length.toLocaleString("th-TH")}
            </p>
          </div>

          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">สินค้าใน Marketplace</p>
            <p className="mt-2 text-3xl font-extrabold">
              {marketplaceItems.length.toLocaleString("th-TH")}
            </p>
          </div>

          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">เบาะแสที่ตรงกับเงื่อนไข</p>
            <p className="mt-2 text-3xl font-extrabold">
              {matches.length.toLocaleString("th-TH")}
            </p>
          </div>
        </section>

        {/* Lost item selector */}
        <section className="mb-8 rounded-3xl border border-[#EEE6F5] bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold">1. เลือกประกาศของหาย</h2>
          <p className="mt-2 text-sm text-[#8B7D94]">
            เลือกรายการที่ต้องการนำไปเปรียบเทียบกับสินค้าใน Marketplace
          </p>

          {reports.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#DCCFF0] bg-[#FAF7FF] p-7 text-center">
              <p className="text-4xl">📭</p>
              <h3 className="mt-3 font-bold">ยังไม่พบประกาศของหาย</h3>
              <p className="mt-2 text-sm leading-6 text-[#8B7D94]">
                ตรวจสอบว่ามีประกาศของหายในระบบแล้วหรือไม่
                และประกาศนั้นมี type เป็น lost หรือ ของหาย
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-4 rounded-xl bg-[#B9A0F8] px-5 py-3 text-sm font-bold"
              >
                กลับไปหน้าหลัก
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold">
                ประกาศที่ต้องการตามหา
              </label>

              <select
                value={selectedReportId}
                onChange={(event) => {
                  setSelectedReportId(event.target.value);
                  setSelectedMatch(null);
                }}
                className={inputClass}
              >
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {getReportName(report) || "ไม่ระบุชื่อสิ่งของ"}
                    {report.color ? ` • ${report.color}` : ""}
                    {report.location ? ` • ${report.location}` : ""}
                  </option>
                ))}
              </select>

              {selectedReport && (
                <div className="mt-4 rounded-2xl bg-[#FAF7FF] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {(selectedReport.imageUrl ||
                      selectedReport.image) && (
                      <img
                        src={
                          selectedReport.imageUrl ||
                          selectedReport.image
                        }
                        alt={getReportName(selectedReport)}
                        className="h-28 w-full rounded-xl object-cover sm:w-32"
                      />
                    )}

                    <div>
                      <h3 className="font-bold">
                        {getReportName(selectedReport)}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedReport.category && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs">
                            หมวดหมู่: {selectedReport.category}
                          </span>
                        )}

                        {selectedReport.color && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs">
                            สี: {selectedReport.color}
                          </span>
                        )}
                      </div>

                      {selectedReport.location && (
                        <p className="mt-2 text-sm text-[#8B7D94]">
                          📍 {selectedReport.location}
                        </p>
                      )}

                      {selectedReport.description && (
                        <p className="mt-2 text-sm leading-6 text-[#8B7D94]">
                          {selectedReport.description}
                        </p>
                      )}

                      {selectedReport.date && (
                        <p className="mt-2 text-xs text-[#A79BAF]">
                          วันที่แจ้งหาย: {formatDate(selectedReport.date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="mb-6 rounded-3xl border border-[#EEE6F5] bg-white p-5">
          <h2 className="text-lg font-bold">2. ค้นหาและกรองเบาะแส</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                ค้นหาสินค้า
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ชื่อสินค้า หมวดหมู่ หรือผู้ขาย..."
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                คะแนนความคล้ายคลึงขั้นต่ำ
              </span>
              <select
                value={minimumScore}
                onChange={(event) => setMinimumScore(event.target.value)}
                className={inputClass}
              >
                <option value="0">แสดงทั้งหมด</option>
                <option value="20">ตั้งแต่ 20% ขึ้นไป</option>
                <option value="40">ตั้งแต่ 40% ขึ้นไป</option>
                <option value="60">ตั้งแต่ 60% ขึ้นไป</option>
                <option value="80">ตั้งแต่ 80% ขึ้นไป</option>
              </select>
            </label>
          </div>
        </section>

        {/* Matches */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              3. ผลการจับคู่เบาะแส
            </h2>
            <p className="mt-2 text-sm text-[#8B7D94]">
              เรียงจากคะแนนความคล้ายคลึงสูงไปต่ำ
            </p>
          </div>

          {reports.length === 0 ? null : marketplaceItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
              <p className="text-4xl">🛍️</p>
              <h3 className="mt-3 font-bold">
                ยังไม่มีสินค้าใน Marketplace
              </h3>
              <p className="mt-2 text-sm text-[#8B7D94]">
                เพิ่มสินค้าจากหน้า Marketplace ก่อน ระบบจึงจะสามารถเปรียบเทียบได้
              </p>
              <button
                type="button"
                onClick={() => router.push("/marketplace")}
                className="mt-4 rounded-xl bg-[#B9A0F8] px-5 py-3 text-sm font-bold"
              >
                ไปที่ Marketplace
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
              <p className="text-4xl">🔍</p>
              <h3 className="mt-3 font-bold">
                ไม่พบเบาะแสตามเงื่อนไข
              </h3>
              <p className="mt-2 text-sm text-[#8B7D94]">
                ลองลดคะแนนขั้นต่ำหรือเปลี่ยนคำค้นหา
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {matches.map((match) => (
                <article
                  key={match.item.id}
                  className="overflow-hidden rounded-3xl border border-[#EEE6F5] bg-white shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="h-48 bg-gradient-to-br from-[#F5F0FF] to-[#FFF0F5] sm:h-auto sm:w-44 sm:shrink-0">
                      {match.item.imageUrl ? (
                        <img
                          src={match.item.imageUrl}
                          alt={match.item.name}
                          className="h-full min-h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-40 items-center justify-center text-5xl">
                          🛍️
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreStyle(
                            match.score
                          )}`}
                        >
                          {getScoreLabel(match.score)}
                        </span>

                        <span className="text-sm font-extrabold text-[#8B6DD1]">
                          {match.score}%
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F0EAF5]">
                        <div
                          className="h-full rounded-full bg-[#B9A0F8] transition-all"
                          style={{ width: `${match.score}%` }}
                        />
                      </div>

                      <h3 className="mt-4 text-lg font-bold">
                        {match.item.name}
                      </h3>

                      <p className="mt-1 text-xs text-[#8B7D94]">
                        {match.item.category}
                      </p>

                      <p className="mt-3 text-xl font-extrabold text-[#8B6DD1]">
                        ฿{formatPrice(match.item.price)}
                      </p>

                      <div className="mt-4">
                        <p className="text-sm font-semibold">
                          เหตุผลที่จับคู่
                        </p>

                        <ul className="mt-2 space-y-2">
                          {match.reasons.map((reason, index) => (
                            <li
                              key={`${match.item.id}-${index}`}
                              className="flex items-start gap-2 text-sm leading-5 text-[#756581]"
                            >
                              <span className="text-[#8B6DD1]">✓</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMatch(match)}
                          className="rounded-xl border border-[#DCCFF0] px-4 py-3 text-sm font-semibold transition hover:bg-[#F5F0FF]"
                        >
                          ดูรายละเอียด
                        </button>

                        <button
                          type="button"
                          onClick={() => openCluePage(match.item)}
                          className="rounded-xl bg-[#B9A0F8] px-4 py-3 text-sm font-bold transition hover:bg-[#A98CEB]"
                        >
                          แจ้งเบาะแส
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Detail modal */}
        {selectedMatch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#30253B]/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedMatch(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="match-detail-title"
              className="my-8 w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="match-detail-title" className="text-xl font-bold">
                    รายละเอียดเบาะแส
                  </h2>
                  <p className="mt-1 text-sm text-[#8B7D94]">
                    คะแนนความคล้ายคลึงเบื้องต้น
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  aria-label="ปิดรายละเอียด"
                  className="rounded-full px-3 py-2 hover:bg-[#F5F0FF]"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-[#FAF7FF] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {selectedMatch.item.name}
                  </span>
                  <span className="text-2xl font-extrabold text-[#8B6DD1]">
                    {selectedMatch.score}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#B9A0F8]"
                    style={{ width: `${selectedMatch.score}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <span className="font-semibold">หมวดหมู่:</span>{" "}
                  {selectedMatch.item.category}
                </p>

                <p>
                  <span className="font-semibold">สภาพ:</span>{" "}
                  {selectedMatch.item.condition || "ไม่ระบุ"}
                </p>

                <p>
                  <span className="font-semibold">ราคา:</span>{" "}
                  ฿{formatPrice(selectedMatch.item.price)}
                </p>

                <p>
                  <span className="font-semibold">ผู้ขาย:</span>{" "}
                  {selectedMatch.item.seller || "ไม่ระบุ"}
                </p>

                <p>
                  <span className="font-semibold">สถานที่:</span>{" "}
                  {selectedMatch.item.location || "ไม่ระบุ"}
                </p>

                <p>
                  <span className="font-semibold">วันที่ลงประกาศ:</span>{" "}
                  {formatDate(selectedMatch.item.createdAt)}
                </p>

                <div>
                  <p className="font-semibold">รายละเอียดสินค้า</p>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-[#8B7D94]">
                    {selectedMatch.item.description ||
                      "ไม่มีรายละเอียดเพิ่มเติม"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                คะแนนนี้เป็นเพียงผลการเปรียบเทียบข้อความ
                ไม่ได้ยืนยันความเป็นเจ้าของหรือการกระทำผิด
              </div>

              <button
                type="button"
                onClick={() => {
                  const item = selectedMatch.item;
                  setSelectedMatch(null);
                  openCluePage(item);
                }}
                className="mt-5 w-full rounded-xl bg-[#B9A0F8] px-4 py-3 text-sm font-bold transition hover:bg-[#A98CEB]"
              >
                แจ้งเบาะแสเกี่ยวกับสินค้านี้
              </button>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 rounded-2xl border border-[#E8DDFB] bg-[#F5F0FF] p-5">
          <h2 className="font-bold">💡 หมายเหตุ</h2>
          <p className="mt-2 text-sm leading-6 text-[#756581]">
            ระบบนี้อ่านข้อมูลจาก localStorage ของเบราว์เซอร์เดียวกัน
            คะแนนคำนวณจากข้อความ ไม่ใช่การตรวจสอบรูปภาพหรือ AI ภายนอก
            และการแจ้งเบาะแสจะนำไปยังหน้า Clue เดิมของคุณ
            โดยบันทึกข้อมูลที่เลือกไว้ใน sessionStorage เพื่อให้หน้าเดิมนำไปใช้ต่อได้
          </p>
        </footer>
      </div>
    </main>
  );
}