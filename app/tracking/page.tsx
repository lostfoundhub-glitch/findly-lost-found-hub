"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Report = {
  id?: string | number;
  type?: string;
  name?: string;
  itemName?: string;
  title?: string;
  category?: string;
  color?: string;
  brand?: string;
  description?: string;
  location?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  image?: string;
  imageUrl?: string;
  imageName?: string;
  contact?: string;
  [key: string]: unknown;
};

type Stage = {
  label: string;
  description: string;
};

const stages: Stage[] = [
  {
    label: "แจ้งรายการแล้ว",
    description: "ระบบได้รับข้อมูลรายการของคุณแล้ว",
  },
  {
    label: "กำลังค้นหา",
    description: "ตรวจสอบประกาศและข้อมูลที่เกี่ยวข้อง",
  },
  {
    label: "พบเบาะแส",
    description: "มีข้อมูลที่อาจเกี่ยวข้องให้ตรวจสอบ",
  },
  {
    label: "ยืนยันเจ้าของ",
    description: "ตรวจสอบข้อมูลเพื่อยืนยันความเป็นเจ้าของ",
  },
  {
    label: "นัดรับคืน",
    description: "ดำเนินการนัดหมายรับสิ่งของ",
  },
  {
    label: "รับคืนสำเร็จ",
    description: "ดำเนินการรับคืนสิ่งของเรียบร้อยแล้ว",
  },
];

const statusOptions = [
  "ทั้งหมด",
  "แจ้งรายการแล้ว",
  "กำลังค้นหา",
  "พบเบาะแส",
  "ยืนยันเจ้าของ",
  "นัดรับคืน",
  "รับคืนสำเร็จ",
];

const styles = {
  text: "#493D55",
  muted: "#8B7D94",
  purple: "#B9A0F8",
  purpleDark: "#8064B5",
  border: "#F0E7F1",
  green: "#78BFA7",
};

function getItemName(report: Report) {
  return String(
    report.name ??
      report.itemName ??
      report.title ??
      "ไม่ระบุชื่อสิ่งของ"
  );
}

function getReportType(report: Report): "lost" | "found" {
  const type = String(report.type ?? "").toLowerCase();

  if (
    type === "found" ||
    type.includes("พบของ") ||
    type.includes("ของที่พบ")
  ) {
    return "found";
  }

  return "lost";
}

function getReportId(report: Report, index: number) {
  return String(
    report.id ??
      `${getItemName(report)}-${report.date ?? report.createdAt ?? index}`
  );
}

function getReportDate(report: Report) {
  return String(report.date ?? report.createdAt ?? "");
}

function getStatus(report: Report): string {
  const raw = String(report.status ?? "").trim();

  if (!raw) {
    return "แจ้งรายการแล้ว";
  }

  const normalized = raw.toLowerCase();

  const mapping: Record<string, string> = {
    reported: "แจ้งรายการแล้ว",
    submitted: "แจ้งรายการแล้ว",
    pending: "แจ้งรายการแล้ว",
    searching: "กำลังค้นหา",
    matched: "พบเบาะแส",
    match_found: "พบเบาะแส",
    verification: "ยืนยันเจ้าของ",
    verifying: "ยืนยันเจ้าของ",
    scheduled: "นัดรับคืน",
    returned: "รับคืนสำเร็จ",
    completed: "รับคืนสำเร็จ",
    resolved: "รับคืนสำเร็จ",
    "แจ้งแล้ว": "แจ้งรายการแล้ว",
    "รอดำเนินการ": "แจ้งรายการแล้ว",
    "กำลังติดตาม": "กำลังค้นหา",
    "รอการยืนยัน": "ยืนยันเจ้าของ",
    "ยืนยันความเป็นเจ้าของ": "ยืนยันเจ้าของ",
    "รับคืนแล้ว": "รับคืนสำเร็จ",
    "เสร็จสิ้น": "รับคืนสำเร็จ",
  };

  if (mapping[normalized]) {
    return mapping[normalized];
  }

  const exact = stages.find((stage) => stage.label === raw);

  if (exact) {
    return exact.label;
  }

  return "แจ้งรายการแล้ว";
}

function getStageIndex(status: string) {
  const index = stages.findIndex((stage) => stage.label === status);
  return Math.max(index, 0);
}

function formatDate(value: string) {
  if (!value) return "ไม่ระบุวันที่";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusColor(status: string) {
  switch (status) {
    case "พบเบาะแส":
      return {
        background: "#FFF3D8",
        color: "#9A6A13",
      };

    case "ยืนยันเจ้าของ":
      return {
        background: "#F0E8FF",
        color: "#8064B5",
      };

    case "นัดรับคืน":
      return {
        background: "#E4F8F0",
        color: "#26765F",
      };

    case "รับคืนสำเร็จ":
      return {
        background: "#DDF5EC",
        color: "#26765F",
      };

    case "กำลังค้นหา":
      return {
        background: "#EAF4FF",
        color: "#4777A8",
      };

    default:
      return {
        background: "#F7F1FF",
        color: "#8064B5",
      };
  }
}

export default function TrackingPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [ready, setReady] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("findly_reports");

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setReports(parsed as Report[]);
        }
      }
    } catch (error) {
      console.error("Findly tracking error:", error);
    } finally {
      setReady(true);
    }
  }, []);

  const enrichedReports = useMemo(() => {
    return reports.map((report, index) => ({
      ...report,
      _id: getReportId(report, index),
      _name: getItemName(report),
      _type: getReportType(report),
      _status: getStatus(report),
      _date: getReportDate(report),
    }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return enrichedReports.filter((report) => {
      const matchesKeyword =
        !query ||
        [
          report._name,
          report.category,
          report.color,
          report.brand,
          report.location,
          report.description,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(query));

      const matchesType =
        filterType === "all" || report._type === filterType;

      const matchesStatus =
        filterStatus === "ทั้งหมด" ||
        report._status === filterStatus;

      return matchesKeyword && matchesType && matchesStatus;
    });
  }, [enrichedReports, keyword, filterType, filterStatus]);

  const selectedReport = enrichedReports.find(
    (report) => report._id === selectedId
  );

  const counts = useMemo(() => {
    return {
      all: enrichedReports.length,

      lost: enrichedReports.filter(
        (report) => report._type === "lost"
      ).length,

      found: enrichedReports.filter(
        (report) => report._type === "found"
      ).length,

      completed: enrichedReports.filter(
        (report) => report._status === "รับคืนสำเร็จ"
      ).length,
    };
  }, [enrichedReports]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FFFAF7] text-[#493D55]">
      <style jsx>{`
        .tracking-background {
          background-image:
            radial-gradient(
              circle at 5% 12%,
              rgba(247, 220, 235, 0.5) 0 75px,
              transparent 77px
            ),
            radial-gradient(
              circle at 95% 35%,
              rgba(229, 221, 251, 0.6) 0 90px,
              transparent 92px
            ),
            radial-gradient(
              circle at 12% 80%,
              rgba(221, 245, 236, 0.5) 0 65px,
              transparent 67px
            );
          background-size: 100% 1000px;
          background-repeat: repeat-y;
        }

        .tracking-card {
          box-shadow: 0 12px 38px rgba(116, 88, 143, 0.07);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .tracking-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 17px 42px rgba(116, 88, 143, 0.11);
        }

        .tracking-input {
          width: 100%;
          border: 1px solid #eadfec;
          border-radius: 14px;
          background: white;
          padding: 12px 14px;
          color: #493d55;
          outline: none;
        }

        .tracking-input:focus {
          border-color: #b9a0f8;
          box-shadow: 0 0 0 3px rgba(185, 160, 248, 0.17);
        }

        .tracking-button {
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .tracking-button:hover {
          transform: translateY(-1px);
        }

        @media (prefers-reduced-motion: reduce) {
          .tracking-card,
          .tracking-button {
            transition: none;
          }

          .tracking-card:hover,
          .tracking-button:hover {
            transform: none;
          }
        }
      `}</style>

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#F0E7F1] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
            aria-label="กลับหน้าแรก Findly"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0E8FF] text-2xl">
              🔎
            </span>

            <span className="flex flex-col">
              <span className="text-2xl font-black tracking-tight">
                findly<span className="text-[#B9A0F8]">.</span>
              </span>

              <span className="text-[9px] font-extrabold tracking-[2px] text-[#9B8AAF]">
                LOST &amp; FOUND HUB
              </span>
            </span>
          </Link>

          <Link
            href="/items"
            className="rounded-full border border-[#E9DFF0] px-4 py-2.5 text-xs font-bold transition hover:bg-[#F7F1FF] sm:text-sm"
          >
            ค้นหาสิ่งของ ↗
          </Link>
        </div>
      </header>

      <div className="tracking-background min-h-[calc(100vh-76px)]">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
          {/* Page title */}
          <section className="mb-9 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F0E8FF] px-4 py-2 text-xs font-extrabold tracking-wide text-[#8064B5]">
              ✦ YOUR ITEM JOURNEY
            </span>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              ติดตามสถานะสิ่งของ
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8B7D94] sm:text-base">
              ติดตามความคืบหน้าของรายการที่คุณแจ้งไว้
              เพื่อช่วยให้สิ่งของได้กลับคืนสู่เจ้าของ 💜
            </p>
          </section>

          {/* Summary */}
          <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "รายการทั้งหมด",
                value: counts.all,
                icon: "📋",
                background: "#F0E8FF",
              },
              {
                label: "รายการของหาย",
                value: counts.lost,
                icon: "🔎",
                background: "#FFF0F3",
              },
              {
                label: "รายการของที่พบ",
                value: counts.found,
                icon: "🎁",
                background: "#E4F8F0",
              },
              {
                label: "รับคืนสำเร็จ",
                value: counts.completed,
                icon: "💚",
                background: "#FFF3D8",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="tracking-card rounded-[22px] border border-[#F0E7F1] bg-white p-4 sm:p-5"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl"
                  style={{ background: item.background }}
                >
                  {item.icon}
                </div>

                <p className="mt-4 text-xs font-semibold text-[#9B8AAF] sm:text-sm">
                  {item.label}
                </p>

                <p className="mt-1 text-3xl font-black">
                  {ready ? item.value : "—"}
                </p>
              </div>
            ))}
          </section>

          {/* Search and filters */}
          <section className="tracking-card mb-7 rounded-[26px] border border-[#F0E7F1] bg-white p-5 sm:p-7">
            <div>
              <h2 className="text-lg font-black">
                รายการที่คุณแจ้งไว้
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#9B8AAF]">
                ค้นหาสิ่งของและกรองรายการตามสถานะได้ที่นี่
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label
                  htmlFor="tracking-search"
                  className="mb-2 block text-xs font-bold text-[#655570]"
                >
                  ค้นหาสิ่งของ
                </label>

                <input
                  id="tracking-search"
                  className="tracking-input"
                  placeholder="ชื่อสิ่งของ สี ยี่ห้อ หรือสถานที่..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="tracking-type"
                  className="mb-2 block text-xs font-bold text-[#655570]"
                >
                  ประเภท
                </label>

                <select
                  id="tracking-type"
                  className="tracking-input"
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="lost">ของหาย</option>
                  <option value="found">ของที่พบ</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="tracking-status"
                  className="mb-2 block text-xs font-bold text-[#655570]"
                >
                  สถานะ
                </label>

                <select
                  id="tracking-status"
                  className="tracking-input"
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setFilterType("all");
                    setFilterStatus("ทั้งหมด");
                  }}
                  className="tracking-button w-full rounded-2xl border border-[#E9DFF0] px-4 py-3 text-sm font-bold text-[#8064B5] hover:bg-[#F7F1FF]"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          </section>

          {/* Loading */}
          {!ready && (
            <div className="rounded-[26px] border border-[#F0E7F1] bg-white p-12 text-center">
              <div className="text-3xl">🔎</div>
              <p className="mt-3 font-bold">กำลังโหลดรายการ...</p>
            </div>
          )}

          {/* Empty state */}
          {ready && enrichedReports.length === 0 && (
            <section className="rounded-[28px] border border-[#F0E7F1] bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#F7F1FF] text-4xl">
                📦
              </div>

              <h2 className="mt-5 text-xl font-black">
                ยังไม่มีรายการให้ติดตาม
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#9B8AAF]">
                เมื่อคุณแจ้งของหายหรือของที่พบผ่านเว็บไซต์
                รายการที่บันทึกไว้ในเบราว์เซอร์นี้จะแสดงที่หน้านี้
              </p>

              <Link
                href="/report"
                className="mt-6 inline-flex rounded-full bg-[#B9A0F8] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 transition hover:bg-[#A58BE8]"
              >
                + แจ้งรายการใหม่
              </Link>
            </section>
          )}

          {/* No search results */}
          {ready &&
            enrichedReports.length > 0 &&
            filteredReports.length === 0 && (
              <section className="rounded-[26px] border border-[#F0E7F1] bg-white p-10 text-center">
                <div className="text-4xl">🔍</div>

                <h2 className="mt-4 font-black">
                  ไม่พบรายการที่ตรงกับการค้นหา
                </h2>

                <p className="mt-2 text-sm text-[#9B8AAF]">
                  ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองอีกครั้ง
                </p>
              </section>
            )}

          {/* Report cards */}
          {ready && filteredReports.length > 0 && (
            <section className="space-y-5">
              {filteredReports.map((report) => {
                const statusColor = getStatusColor(report._status);
                const stageIndex = getStageIndex(report._status);
                const isLost = report._type === "lost";

                const image =
                  typeof report.image === "string"
                    ? report.image
                    : typeof report.imageUrl === "string"
                      ? report.imageUrl
                      : "";

                return (
                  <article
                    key={report._id}
                    className="tracking-card overflow-hidden rounded-[26px] border border-[#F0E7F1] bg-white"
                  >
                    <div className="p-5 sm:p-7">
                      <div className="flex flex-col gap-5 sm:flex-row">
                        {/* Image */}
                        <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-[#F7E9FF] to-[#E4F8F0] sm:h-36 sm:w-36">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt={report._name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-5xl">
                              {isLost ? "🔎" : "🎁"}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-extrabold"
                              style={{
                                background: isLost ? "#FFF0F3" : "#E4F8F0",
                                color: isLost ? "#B65D7B" : "#26765F",
                              }}
                            >
                              {isLost ? "🔎 ของหาย" : "🎁 ของที่พบ"}
                            </span>

                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-extrabold"
                              style={{
                                background: statusColor.background,
                                color: statusColor.color,
                              }}
                            >
                              {report._status}
                            </span>
                          </div>

                          <h2 className="mt-3 break-words text-xl font-black">
                            {report._name}
                          </h2>

                          <div className="mt-3 space-y-2 text-sm text-[#8B7D94]">
                            {report.category && (
                              <p>📂 หมวดหมู่: {report.category}</p>
                            )}

                            {report.color && (
                              <p>🎨 สี: {report.color}</p>
                            )}

                            {report.location && (
                              <p className="break-words">
                                📍 สถานที่: {report.location}
                              </p>
                            )}

                            <p>
                              📅 วันที่แจ้ง: {formatDate(report._date)}
                            </p>
                          </div>
                        </div>

                        {/* Detail button */}
                        <div className="flex shrink-0 items-center sm:items-start">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                selectedId === report._id
                                  ? null
                                  : report._id
                              )
                            }
                            aria-expanded={selectedId === report._id}
                            className="tracking-button w-full rounded-full border border-[#E9DFF0] px-5 py-3 text-sm font-bold text-[#8064B5] hover:bg-[#F7F1FF] sm:w-auto"
                          >
                            {selectedId === report._id
                              ? "ซ่อนรายละเอียด"
                              : "ดูรายละเอียด ↗"}
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-7 rounded-[20px] bg-[#FCF9FF] p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black">
                            ความคืบหน้าของรายการ
                          </h3>

                          <span className="text-xs font-extrabold text-[#8064B5]">
                            ขั้นที่ {stageIndex + 1} จาก {stages.length}
                          </span>
                        </div>

                        <div
                          className="mt-4 h-2 overflow-hidden rounded-full bg-[#EDE5F4]"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={stages.length - 1}
                          aria-valuenow={stageIndex}
                          aria-label="ความคืบหน้าของรายการ"
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                (stageIndex / (stages.length - 1)) * 100
                              }%`,
                              background:
                                report._status === "รับคืนสำเร็จ"
                                  ? styles.green
                                  : styles.purple,
                            }}
                          />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          {stages.map((stage, index) => {
                            const completed = index < stageIndex;
                            const active = index === stageIndex;

                            return (
                              <div
                                key={stage.label}
                                className="flex items-start gap-2"
                              >
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                                  style={{
                                    background:
                                      completed || active
                                        ? active && index === 5
                                          ? "#78BFA7"
                                          : "#B9A0F8"
                                        : "#F0EAF4",
                                    color:
                                      completed || active
                                        ? "#FFFFFF"
                                        : "#A99CB2",
                                  }}
                                >
                                  {completed ? "✓" : index + 1}
                                </span>

                                <div>
                                  <p
                                    className="text-[11px] font-extrabold leading-5"
                                    style={{
                                      color:
                                        active || completed
                                          ? styles.text
                                          : "#B5A9BD",
                                    }}
                                  >
                                    {stage.label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Next action */}
                      <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-[#E9DFF0] bg-white p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0E8FF]">
                          💡
                        </span>

                        <div>
                          <p className="text-sm font-black">
                            ขั้นตอนถัดไป
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#8B7D94]">
                            {report._status === "รับคืนสำเร็จ"
                              ? "รายการนี้เสร็จสิ้นแล้ว ขอบคุณที่ช่วยกันดูแลสิ่งของในมหาวิทยาลัย"
                              : report._status === "นัดรับคืน"
                                ? "ตรวจสอบวัน เวลา และสถานที่นัดรับคืนกับผู้เกี่ยวข้อง"
                                : report._status === "ยืนยันเจ้าของ"
                                  ? "ตรวจสอบข้อมูลและดำเนินการยืนยันความเป็นเจ้าของให้เรียบร้อย"
                                  : report._status === "พบเบาะแส"
                                    ? "เปิดดูรายละเอียดเบาะแสและตรวจสอบข้อมูลเพิ่มเติม"
                                    : report._status === "กำลังค้นหา"
                                      ? "ตรวจสอบประกาศที่เกี่ยวข้องและติดตามข้อมูลเพิ่มเติม"
                                      : "ตรวจสอบรายละเอียดรายการของคุณ และรอข้อมูลที่เกี่ยวข้อง"}
                          </p>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {selectedId === report._id && (
                        <div className="mt-5 rounded-[20px] border border-[#F0E7F1] p-5">
                          <h3 className="text-base font-black">
                            รายละเอียดสิ่งของ
                          </h3>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold text-[#9B8AAF]">
                                ยี่ห้อ / รุ่น
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold">
                                {String(report.brand || "ไม่ได้ระบุ")}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold text-[#9B8AAF]">
                                วันที่แจ้ง
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {formatDate(report._date)}
                              </p>
                            </div>

                            <div className="sm:col-span-2">
                              <p className="text-xs font-bold text-[#9B8AAF]">
                                รายละเอียดเพิ่มเติม
                              </p>

                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7">
                                {String(
                                  report.description || "ไม่ได้ระบุรายละเอียด"
                                )}
                              </p>
                            </div>

                            <div className="sm:col-span-2">
                              <p className="text-xs font-bold text-[#9B8AAF]">
                                สถานะปัจจุบัน
                              </p>

                              <p className="mt-1 text-sm font-bold">
                                {report._status}
                              </p>

                              <p className="mt-2 text-xs leading-6 text-[#9B8AAF]">
                                หน้านี้แสดงสถานะจากข้อมูลที่บันทึกไว้ในเบราว์เซอร์
                                การเปลี่ยนสถานะโดยผู้ดูแลระบบและการเชื่อมต่อฐานข้อมูล
                                จะพัฒนาในขั้นตอนถัดไป
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Bottom actions */}
          <section className="mt-9 flex flex-col items-center justify-between gap-4 rounded-[26px] border border-[#F0E7F1] bg-white p-5 sm:flex-row sm:p-7">
            <div>
              <h2 className="font-black">ต้องการแจ้งรายการเพิ่มเติมไหม?</h2>

              <p className="mt-1 text-sm leading-6 text-[#9B8AAF]">
                เพิ่มข้อมูลของหายหรือของที่พบเพื่อช่วยให้ค้นหาได้ง่ายขึ้น
              </p>
            </div>

            <Link
              href="/report"
              className="tracking-button inline-flex w-full items-center justify-center rounded-full bg-[#B9A0F8] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 hover:bg-[#A58BE8] sm:w-auto"
            >
              + แจ้งรายการใหม่
            </Link>
          </section>

          <footer className="mt-8 text-center text-xs leading-6 text-[#B5A9BD]">
            Findly · Lost &amp; Found Hub
            <br />
            ช่วยกันตามหา เพื่อให้สิ่งของได้กลับคืนสู่เจ้าของ 💜
          </footer>
        </div>
      </div>
    </main>
  );
}