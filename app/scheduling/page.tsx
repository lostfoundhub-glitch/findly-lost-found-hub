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
  location?: string;
  date?: string;
  image?: string;
  imageUrl?: string;
};

type Appointment = {
  id: string;
  reportId: string;
  itemName: string;
  itemType: string;
  date: string;
  time: string;
  pickupMethod: "central" | "campus";
  location: string;
  mapLink: string;
  note: string;
  status: string;
  createdAt: string;
};

const PURPLE = "#B9A0F8";

function getItemName(report: Report) {
  return String(
    report.name ??
      report.itemName ??
      report.title ??
      "ไม่ระบุชื่อสิ่งของ"
  );
}

function getItemType(report: Report): "lost" | "found" {
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

function getItemId(report: Report, index: number) {
  return String(
    report.id ??
      `${getItemName(report)}-${report.date ?? index}`
  );
}

function formatDate(value: string) {
  if (!value) return "ไม่ระบุวันที่";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function readAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem("findly_appointments");

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    // รองรับนัดหมายเก่าที่สร้างก่อนมีฟิลด์ mapLink
    return parsed.map((item) => ({
      ...item,
      mapLink:
        typeof item.mapLink === "string" ? item.mapLink : "",
    }));
  } catch {
    return [];
  }
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isGoogleMapsLink(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();

    return (
      host === "maps.google.com" ||
      host === "maps.app.goo.gl" ||
      host === "google.com" ||
      host.endsWith(".google.com") &&
        (url.pathname.startsWith("/maps") ||
          url.pathname.startsWith("/url")) ||
      /^google\.[a-z.]+$/.test(host) &&
        url.pathname.startsWith("/maps")
    );
  } catch {
    return false;
  }
}

export default function SchedulingPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ready, setReady] = useState(false);

  const [selectedId, setSelectedId] = useState("");
  const [date, setDate] = useState(getToday);
  const [time, setTime] = useState("10:00");

  const [pickupMethod, setPickupMethod] = useState<
    "central" | "campus"
  >("central");

  const [location, setLocation] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [note, setNote] = useState("");

  const [activeTab, setActiveTab] = useState<"new" | "history">(
    "new"
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("findly_reports");

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setReports(parsed as Report[]);
        }
      }

      setAppointments(readAppointments());
    } catch (err) {
      console.error("Findly scheduling loading error:", err);
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setReady(true);
    }
  }, []);

  const items = useMemo(() => {
    return reports.map((report, index) => ({
      ...report,
      _id: getItemId(report, index),
      _name: getItemName(report),
      _type: getItemType(report),
    }));
  }, [reports]);

  const selectedItem = items.find(
    (item) => item._id === selectedId
  );

  const today = getToday();

  function handlePickupMethodChange(
    method: "central" | "campus"
  ) {
    setPickupMethod(method);
    setLocation("");
    setMapLink("");
    setError("");
    setSuccess("");
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedItem) {
      setError("กรุณาเลือกสิ่งของที่ต้องการนัดรับคืน");
      return;
    }

    if (date < today) {
      setError("กรุณาเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป");
      return;
    }

    if (!time) {
      setError("กรุณาเลือกเวลานัดหมาย");
      return;
    }

    if (!location.trim()) {
      setError("กรุณาระบุสถานที่นัดรับคืน");
      return;
    }

    if (mapLink.trim() && !isGoogleMapsLink(mapLink.trim())) {
      setError(
        "ลิงก์แผนที่ไม่ถูกต้อง กรุณาใช้ลิงก์ Google Maps ที่ขึ้นต้นด้วย https://"
      );
      return;
    }

    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      reportId: selectedItem._id,
      itemName: selectedItem._name,
      itemType: selectedItem._type,
      date,
      time,
      pickupMethod,
      location: location.trim(),
      mapLink: mapLink.trim(),
      note: note.trim(),
      status: "รอยืนยันนัดหมาย",
      createdAt: new Date().toISOString(),
    };

    try {
      const updated = [newAppointment, ...appointments];

      localStorage.setItem(
        "findly_appointments",
        JSON.stringify(updated)
      );

      setAppointments(updated);
      setLocation("");
      setMapLink("");
      setNote("");

      setSuccess(
        "บันทึกข้อมูลนัดหมายในเบราว์เซอร์เรียบร้อยแล้ว แต่ยังไม่ได้ส่งให้ผู้เกี่ยวข้องยืนยัน"
      );

      setActiveTab("history");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error("Findly scheduling save error:", err);

      setError(
        "ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบพื้นที่จัดเก็บข้อมูล"
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] text-[#493D55]">
      <style jsx>{`
        .scheduling-background {
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
          min-width: 0;
          border: 1px solid #eadfec;
          border-radius: 15px;
          background: #fff;
          padding: 12px 14px;
          color: #493d55;
          outline: none;
        }

        .field:focus {
          border-color: #b9a0f8;
          box-shadow: 0 0 0 3px rgba(185, 160, 248, 0.18);
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          color: #655570;
          font-size: 13px;
          font-weight: 800;
        }

        .tab-button {
          border-radius: 14px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 800;
        }

        .method-card {
          border: 1px solid #eadfec;
          border-radius: 18px;
          background: #fff;
          padding: 16px;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .method-card:hover {
          border-color: #b9a0f8;
        }

        @media (prefers-reduced-motion: reduce) {
          .method-card {
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

      <div className="scheduling-background min-h-[calc(100vh-76px)]">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-9 sm:px-8 sm:pt-12">
          {/* Title */}
          <section className="mb-8 text-center">
            <span className="inline-flex rounded-full bg-[#F0E8FF] px-4 py-2 text-xs font-extrabold tracking-wide text-[#8064B5]">
              ✦ RETURN SCHEDULING
            </span>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              นัดหมายรับคืนสิ่งของ
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8B7D94] sm:text-base">
              เลือกวัน เวลา และสถานที่ที่สะดวก
              เพื่อเตรียมรับคืนสิ่งของของคุณ 💜
            </p>
          </section>

          {/* Information */}
          <section className="mb-6 flex items-start gap-3 rounded-[22px] border border-[#E5DDFB] bg-white/90 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0E8FF] text-xl">
              📅
            </span>

            <div>
              <h2 className="font-black">นัดหมายในแบบที่สะดวก</h2>

              <p className="mt-1 text-sm leading-6 text-[#8B7D94]">
                เลือกจุดนัดพบที่เหมาะสม และระบุรายละเอียดให้ชัดเจน
                ก่อนส่งข้อมูลการนัดหมาย
              </p>
            </div>
          </section>

          {/* Messages */}
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
                setActiveTab("new");
                setError("");
                setSuccess("");
              }}
              className="tab-button flex-1"
              style={{
                background:
                  activeTab === "new" ? "#F0E8FF" : "transparent",
                color:
                  activeTab === "new" ? "#8064B5" : "#9B8AAF",
              }}
            >
              📅 สร้างนัดหมาย
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
              📋 ประวัตินัดหมาย ({appointments.length})
            </button>
          </div>

          {/* Appointment form */}
          {activeTab === "new" && (
            <form
              onSubmit={handleSubmit}
              className="soft-card rounded-[28px] border border-[#F0E7F1] bg-white p-5 sm:p-8"
            >
              <div>
                <h2 className="text-xl font-black">ข้อมูลการนัดหมาย</h2>

                <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                  กรอกรายละเอียดสำหรับการรับคืนสิ่งของ
                </p>
              </div>

              {/* Item selection */}
              <div className="mt-6">
                <label htmlFor="schedule-item" className="field-label">
                  เลือกสิ่งของที่ต้องการนัดรับคืน
                  <span className="text-[#E58CA3]"> *</span>
                </label>

                <select
                  id="schedule-item"
                  className="field"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                >
                  <option value="">เลือกสิ่งของ</option>

                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item._name} —{" "}
                      {item._type === "lost" ? "ของหาย" : "ของที่พบ"}
                    </option>
                  ))}
                </select>

                {ready && items.length === 0 && (
                  <div className="mt-3 rounded-2xl bg-[#FCF9FF] p-4 text-sm leading-6 text-[#8B7D94]">
                    ยังไม่มีรายการสิ่งของในเบราว์เซอร์นี้{" "}
                    <Link
                      href="/report"
                      className="font-extrabold text-[#8064B5] underline"
                    >
                      แจ้งสิ่งของใหม่
                    </Link>
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="mt-4 rounded-[18px] bg-[#FCF9FF] p-4">
                  <p className="font-black">{selectedItem._name}</p>

                  <p className="mt-2 text-xs leading-6 text-[#8B7D94]">
                    {selectedItem.category || "ไม่ระบุหมวดหมู่"}
                    {selectedItem.color ? ` · สี${selectedItem.color}` : ""}
                    {selectedItem.location ? ` · ${selectedItem.location}` : ""}
                  </p>
                </div>
              )}

              <div className="my-7 border-t border-dashed border-[#E9DFED]" />

              {/* Date and time */}
              <h3 className="text-lg font-black">วันและเวลาที่ต้องการ</h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="schedule-date" className="field-label">
                    วันที่นัดหมาย
                    <span className="text-[#E58CA3]"> *</span>
                  </label>

                  <input
                    id="schedule-date"
                    type="date"
                    className="field"
                    min={today}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="schedule-time" className="field-label">
                    เวลานัดหมาย
                    <span className="text-[#E58CA3]"> *</span>
                  </label>

                  <select
                    id="schedule-time"
                    className="field"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                  >
                    {[
                      "09:00",
                      "09:30",
                      "10:00",
                      "10:30",
                      "11:00",
                      "11:30",
                      "12:00",
                      "12:30",
                      "13:00",
                      "13:30",
                      "14:00",
                      "14:30",
                      "15:00",
                      "15:30",
                      "16:00",
                      "16:30",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="my-7 border-t border-dashed border-[#E9DFED]" />

              {/* Pickup method */}
              <h3 className="text-lg font-black">วิธีรับคืนสิ่งของ</h3>

              <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                เลือกวิธีที่สะดวกสำหรับคุณ
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handlePickupMethodChange("central")}
                  className="method-card"
                  style={{
                    borderColor:
                      pickupMethod === "central" ? PURPLE : "#EADFEC",
                    background:
                      pickupMethod === "central" ? "#F7F1FF" : "#FFFFFF",
                  }}
                >
                  <span className="text-3xl">🏢</span>
                  <p className="mt-3 font-black">จุดรับคืนส่วนกลาง</p>
                  <p className="mt-2 text-xs leading-6 text-[#8B7D94]">
                    นัดรับคืน ณ จุดกลางที่ผู้เกี่ยวข้องตกลงกัน
                  </p>

                  {pickupMethod === "central" && (
                    <p className="mt-3 text-xs font-extrabold text-[#8064B5]">
                      ✓ เลือกแล้ว
                    </p>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handlePickupMethodChange("campus")}
                  className="method-card"
                  style={{
                    borderColor:
                      pickupMethod === "campus" ? "#8ED8C2" : "#EADFEC",
                    background:
                      pickupMethod === "campus" ? "#EFFCF7" : "#FFFFFF",
                  }}
                >
                  <span className="text-3xl">📍</span>
                  <p className="mt-3 font-black">นัดพบเอง</p>
                  <p className="mt-2 text-xs leading-6 text-[#8B7D94]">
                    ระบุสถานที่และแนบลิงก์ Google Maps เพื่อให้หาจุดนัดพบได้ง่าย
                  </p>

                  {pickupMethod === "campus" && (
                    <p className="mt-3 text-xs font-extrabold text-[#26765F]">
                      ✓ เลือกแล้ว
                    </p>
                  )}
                </button>
              </div>

              {/* Location */}
              <div className="mt-6">
                <label htmlFor="schedule-location" className="field-label">
                  {pickupMethod === "central"
                    ? "ชื่อจุดรับคืนส่วนกลาง"
                    : "สถานที่นัดพบ"}
                  <span className="text-[#E58CA3]"> *</span>
                </label>

                <input
                  id="schedule-location"
                  className="field"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={
                    pickupMethod === "central"
                      ? "เช่น จุดรับคืนของหายที่ตกลงกัน"
                      : "เช่น อาคารเรียน ห้องสมุด หรือโรงอาหาร"
                  }
                  maxLength={200}
                  required
                />

                <p className="mt-2 text-xs leading-5 text-[#9B8AAF]">
                  โปรดตกลงสถานที่กับผู้เกี่ยวข้องก่อนเดินทางไปรับสิ่งของ
                </p>
              </div>

              {/* Google Maps link */}
              <div className="mt-6">
                <label htmlFor="schedule-map-link" className="field-label">
                  📍 ลิงก์ Google Maps{" "}
                  {pickupMethod === "campus" ? (
                    <span className="text-[#E58CA3]">*</span>
                  ) : (
                    <span className="font-normal text-[#9B8AAF]">
                      (ไม่บังคับ)
                    </span>
                  )}
                </label>

                <input
                  id="schedule-map-link"
                  type="url"
                  className="field"
                  value={mapLink}
                  onChange={(event) => setMapLink(event.target.value)}
                  placeholder="https://maps.google.com/..."
                  maxLength={2000}
                  required={pickupMethod === "campus"}
                />

                <p className="mt-2 text-xs leading-6 text-[#9B8AAF]">
                  เปิด Google Maps เลือกจุดนัดพบ กดแชร์ แล้วคัดลอกลิงก์มาวางที่นี่
                </p>

                {mapLink.trim() && isGoogleMapsLink(mapLink.trim()) && (
                  <a
                    href={mapLink.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E4F8F0] px-4 py-2.5 text-sm font-bold text-[#26765F] hover:bg-[#D5F3E7]"
                  >
                    เปิดตำแหน่งใน Google Maps ↗
                  </a>
                )}

                {mapLink.trim() && !isGoogleMapsLink(mapLink.trim()) && (
                  <p className="mt-2 text-xs text-[#B65D7B]">
                    กรุณาใช้ลิงก์ Google Maps ที่ถูกต้อง
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label htmlFor="schedule-note" className="field-label">
                  หมายเหตุเพิ่มเติม (ไม่บังคับ)
                </label>

                <textarea
                  id="schedule-note"
                  className="field min-h-28 resize-y"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="เช่น รายละเอียดการนัดพบหรือข้อมูลที่ต้องแจ้งเพิ่มเติม"
                  maxLength={1000}
                />

                <p className="mt-1 text-right text-xs text-[#B5A9BD]">
                  {note.length}/1000 ตัวอักษร
                </p>
              </div>

              {/* Preview */}
              <div className="mt-7 rounded-[22px] border border-[#E9DFF0] bg-[#FCF9FF] p-5">
                <h3 className="font-black">🗓️ สรุปข้อมูลนัดหมาย</h3>

                <div className="mt-4 space-y-3 text-sm leading-6 text-[#8B7D94]">
                  <p>
                    <span className="font-bold text-[#493D55]">สิ่งของ:</span>{" "}
                    {selectedItem?._name || "ยังไม่ได้เลือก"}
                  </p>

                  <p>
                    <span className="font-bold text-[#493D55]">วันที่:</span>{" "}
                    {formatDate(date)}
                  </p>

                  <p>
                    <span className="font-bold text-[#493D55]">เวลา:</span>{" "}
                    {time} น.
                  </p>

                  <p>
                    <span className="font-bold text-[#493D55]">
                      วิธีรับคืน:
                    </span>{" "}
                    {pickupMethod === "central"
                      ? "จุดรับคืนส่วนกลาง"
                      : "นัดพบเอง"}
                  </p>

                  <p className="break-words">
                    <span className="font-bold text-[#493D55]">สถานที่:</span>{" "}
                    {location.trim() || "ยังไม่ได้ระบุ"}
                  </p>

                  {mapLink.trim() && isGoogleMapsLink(mapLink.trim()) && (
                    <p className="break-all">
                      <span className="font-bold text-[#493D55]">
                        Google Maps:
                      </span>{" "}
                      <a
                        href={mapLink.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#26765F] underline"
                      >
                        ดูตำแหน่งจุดนัดพบ ↗
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Link
                  href="/verification"
                  className="rounded-full px-5 py-3 text-center text-sm font-bold text-[#8B7D94] hover:bg-[#FAF5FC]"
                >
                  ← กลับหน้ายืนยันเจ้าของ
                </Link>

                <button
                  type="submit"
                  disabled={!ready || items.length === 0}
                  className="rounded-full bg-[#B9A0F8] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 transition hover:bg-[#A58BE8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  บันทึกนัดหมาย ✦
                </button>
              </div>

              <p className="mt-5 text-center text-xs leading-6 text-[#B5A9BD]">
                ต้นแบบนี้ยังไม่ได้ส่งคำเชิญหรือยืนยันนัดหมายกับผู้ใช้คนอื่น
              </p>
            </form>
          )}

          {/* Appointment history */}
          {activeTab === "history" && (
            <section className="soft-card rounded-[28px] border border-[#F0E7F1] bg-white p-5 sm:p-8">
              <h2 className="text-xl font-black">ประวัติการนัดหมาย</h2>

              <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                รายการนัดหมายที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้
              </p>

              {!ready ? (
                <div className="mt-6 rounded-2xl bg-[#FCF9FF] p-8 text-center text-sm text-[#9B8AAF]">
                  กำลังโหลดข้อมูล...
                </div>
              ) : appointments.length === 0 ? (
                <div className="mt-6 rounded-[22px] bg-[#FCF9FF] px-5 py-12 text-center">
                  <div className="text-4xl">📅</div>

                  <h3 className="mt-4 font-black">
                    ยังไม่มีประวัติการนัดหมาย
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9B8AAF]">
                    สร้างนัดหมายใหม่เพื่อให้รายการแสดงในส่วนนี้
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveTab("new")}
                    className="mt-5 rounded-full bg-[#B9A0F8] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#A58BE8]"
                  >
                    + สร้างนัดหมาย
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {appointments.map((appointment) => (
                    <article
                      key={appointment.id}
                      className="rounded-[22px] border border-[#F0E7F1] p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <h3 className="break-words font-black">
                            {appointment.itemName}
                          </h3>

                          <p className="mt-2 text-sm text-[#8B7D94]">
                            📅 {formatDate(appointment.date)}
                          </p>

                          <p className="mt-1 text-sm text-[#8B7D94]">
                            🕒 {appointment.time} น.
                          </p>
                        </div>

                        <span className="h-fit w-fit rounded-full bg-[#FFF3D8] px-3 py-1.5 text-xs font-extrabold text-[#9A6A13]">
                          {appointment.status}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-[#FCF9FF] p-4">
                        <p className="text-xs font-bold text-[#9B8AAF]">
                          วิธีรับคืน
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {appointment.pickupMethod === "central"
                            ? "จุดรับคืนส่วนกลาง"
                            : "นัดพบเอง"}
                        </p>

                        <p className="mt-3 text-xs font-bold text-[#9B8AAF]">
                          สถานที่
                        </p>

                        <p className="mt-1 break-words text-sm leading-6">
                          {appointment.location}
                        </p>

                        {appointment.mapLink &&
                          isGoogleMapsLink(appointment.mapLink) && (
                            <a
                              href={appointment.mapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E4F8F0] px-4 py-2.5 text-sm font-bold text-[#26765F] hover:bg-[#D5F3E7]"
                            >
                              📍 ดูจุดนัดพบใน Google Maps ↗
                            </a>
                          )}

                        {appointment.note && (
                          <>
                            <p className="mt-3 text-xs font-bold text-[#9B8AAF]">
                              หมายเหตุ
                            </p>

                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                              {appointment.note}
                            </p>
                          </>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-6 text-[#9B8AAF]">
                        สถานะเริ่มต้นของต้นแบบ: รอยืนยันนัดหมาย
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Footer */}
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