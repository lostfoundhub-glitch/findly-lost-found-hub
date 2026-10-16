"use client";

import { useEffect, useMemo, useState } from "react";

type Report = {
  id: string;
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
  status?: string;
  description?: string;
  createdAt?: string;
  userName?: string;
  email?: string;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  status: string;
  date: string;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type Tab = "overview" | "reports" | "issues" | "users";

const REPORTS_KEY = "findly_reports";
const ISSUES_KEY = "findly_issues";
const USERS_KEY = "findly_users";

const COLORS = {
  background: "#FFFAF7",
  purple: "#B9A0F8",
  purpleDark: "#8B6DD1",
  text: "#493D55",
  muted: "#8B7D94",
  border: "#EEE6F5",
};

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

function getReportName(report: Report): string {
  return report.itemName || report.title || report.name || "ไม่ระบุชื่อสิ่งของ";
}

function getReportType(report: Report): string {
  const type = (report.type || "").toLowerCase();

  if (
    type.includes("found") ||
    type.includes("พบ") ||
    type.includes("เก็บ")
  ) {
    return "ของที่พบ";
  }

  if (type.includes("lost") || type.includes("หาย")) {
    return "ของหาย";
  }

  return report.type || "ไม่ระบุประเภท";
}

function getReportStatus(report: Report): string {
  return report.status || "รอดำเนินการ";
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

function normalizeReport(report: Report): Report {
  return {
    ...report,
    id: String(report.id || `report-${Math.random().toString(36).slice(2)}`),
  };
}

function StatCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: string;
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-[#EEE6F5] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#8B7D94]">{title}</p>
          <p className="mt-3 text-3xl font-extrabold text-[#493D55]">
            {value.toLocaleString("th-TH")}
          </p>
          <p className="mt-2 text-xs text-[#8B7D94]">{detail}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0FF] text-2xl">
          {icon}
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [reports, setReports] = useState<Report[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadedReports = readArray<Report>(REPORTS_KEY).map(normalizeReport);

    setReports(loadedReports);
    setIssues(readArray<Issue>(ISSUES_KEY));
    setUsers(readArray<UserRecord>(USERS_KEY));
    setLoaded(true);
  }, []);

  const lostCount = reports.filter(
    (report) => getReportType(report) === "ของหาย"
  ).length;

  const foundCount = reports.filter(
    (report) => getReportType(report) === "ของที่พบ"
  ).length;

  const pendingCount = reports.filter((report) => {
    const status = getReportStatus(report).toLowerCase();

    return (
      status.includes("pending") ||
      status.includes("รอ") ||
      status.includes("ตรวจสอบ")
    );
  }).length;

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !keyword ||
        [
          getReportName(report),
          report.category || "",
          report.location || "",
          report.id,
        ].some((value) => value.toLowerCase().includes(keyword));

      const matchesType =
        typeFilter === "ทั้งหมด" || getReportType(report) === typeFilter;

      const matchesStatus =
        statusFilter === "ทั้งหมด" ||
        getReportStatus(report) === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, search, typeFilter, statusFilter]);

  function updateReportStatus(id: string, newStatus: string) {
    const updated = reports.map((report) =>
      report.id === id ? { ...report, status: newStatus } : report
    );

    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
      setReports(updated);
      setNotice("อัปเดตสถานะประกาศแล้ว");
    } catch {
      setNotice("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  function deleteReport(id: string) {
    const confirmed = window.confirm(
      "ต้องการลบประกาศนี้ออกจากข้อมูลในเบราว์เซอร์ใช่หรือไม่?"
    );

    if (!confirmed) return;

    const updated = reports.filter((report) => report.id !== id);

    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
      setReports(updated);
      setNotice("ลบประกาศแล้ว");
    } catch {
      setNotice("ลบประกาศไม่สำเร็จ");
    }
  }

  function updateIssueStatus(id: string, newStatus: string) {
    const updated = issues.map((issue) =>
      issue.id === id ? { ...issue, status: newStatus } : issue
    );

    try {
      localStorage.setItem(ISSUES_KEY, JSON.stringify(updated));
      setIssues(updated);
      setNotice("อัปเดตสถานะรายงานแล้ว");
    } catch {
      setNotice("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  function refreshData() {
    setReports(readArray<Report>(REPORTS_KEY).map(normalizeReport));
    setIssues(readArray<Issue>(ISSUES_KEY));
    setUsers(readArray<UserRecord>(USERS_KEY));
    setNotice("โหลดข้อมูลล่าสุดจากเบราว์เซอร์แล้ว");
  }

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "ภาพรวมระบบ", icon: "📊" },
    { id: "reports", label: "จัดการประกาศ", icon: "📦" },
    { id: "issues", label: "รายงานปัญหา", icon: "🚨" },
    { id: "users", label: "จัดการผู้ใช้", icon: "👥" },
  ];

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFAF7] text-[#493D55]">
        กำลังโหลดข้อมูลผู้ดูแลระบบ...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] px-4 py-8 text-[#493D55] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-wide text-[#8B6DD1]">
              FINDLY • ADMIN PANEL
            </p>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              จัดการระบบ Findly
            </h1>

            <p className="mt-3 text-sm text-[#8B7D94] sm:text-base">
              ภาพรวมประกาศและการจัดการข้อมูลภายในระบบ
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

        {/* Navigation */}
        <nav className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-[#EEE6F5] bg-white p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setSearch("");
                setNotice("");
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === item.id
                  ? "bg-[#B9A0F8] text-[#493D55]"
                  : "text-[#8B7D94] hover:bg-[#F5F0FF] hover:text-[#493D55]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Overview */}
        {activeTab === "overview" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">ภาพรวมระบบ</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                สรุปข้อมูลที่อ่านได้จากเบราว์เซอร์นี้
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon="📦"
                title="ประกาศทั้งหมด"
                value={reports.length}
                detail="รายการของหายและของที่พบ"
              />
              <StatCard
                icon="🔍"
                title="แจ้งของหาย"
                value={lostCount}
                detail="ประกาศประเภทของหาย"
              />
              <StatCard
                icon="🎒"
                title="แจ้งพบของ"
                value={foundCount}
                detail="ประกาศประเภทของที่พบ"
              />
              <StatCard
                icon="⏳"
                title="รอดำเนินการ"
                value={pendingCount}
                detail="สถานะที่ระบุว่ารอหรือกำลังตรวจสอบ"
              />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-[#EEE6F5] bg-white p-6">
                <h3 className="text-lg font-bold">📋 ประกาศล่าสุด</h3>
                <p className="mt-1 text-sm text-[#8B7D94]">
                  รายการล่าสุดที่บันทึกในเบราว์เซอร์
                </p>

                {reports.length === 0 ? (
                  <div className="mt-5 rounded-2xl bg-[#FAF7FF] p-6 text-center">
                    <p className="text-3xl">📭</p>
                    <p className="mt-2 font-semibold">ยังไม่มีประกาศ</p>
                    <p className="mt-1 text-sm text-[#8B7D94]">
                      เมื่อมีข้อมูลใน findly_reports รายการจะแสดงที่นี่
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {[...reports].slice(-5).reverse().map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center gap-3 rounded-2xl bg-[#FAF7FF] p-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                          {getReportType(report) === "ของที่พบ" ? "🎒" : "🔍"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {getReportName(report)}
                          </p>
                          <p className="mt-1 text-xs text-[#8B7D94]">
                            {getReportType(report)} ·{" "}
                            {formatDate(report.date || report.createdAt)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs">
                          {getReportStatus(report)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("reports")}
                  className="mt-5 text-sm font-semibold text-[#8B6DD1] hover:underline"
                >
                  ดูประกาศทั้งหมด →
                </button>
              </section>

              <section className="rounded-3xl border border-[#EEE6F5] bg-white p-6">
                <h3 className="text-lg font-bold">🛠️ สถานะข้อมูลระบบ</h3>
                <p className="mt-1 text-sm text-[#8B7D94]">
                  ข้อมูลที่มีอยู่ในเบราว์เซอร์ปัจจุบัน
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">ประกาศของหายและของที่พบ</span>
                    <span className="font-bold">{reports.length} รายการ</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">รายงานปัญหา</span>
                    <span className="font-bold">{issues.length} รายการ</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">ข้อมูลผู้ใช้ที่อ่านได้</span>
                    <span className="font-bold">{users.length} รายการ</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-800">
                    ⚠️ โหมดทดสอบ
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    หน้านี้ยังไม่มีระบบยืนยันสิทธิ์ผู้ดูแล และข้อมูล localStorage
                    ไม่ใช่ฐานข้อมูลกลาง ผู้ใช้แต่ละเบราว์เซอร์อาจเห็นข้อมูลไม่เหมือนกัน
                  </p>
                </div>
              </section>
            </div>
          </section>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">จัดการประกาศ</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                ค้นหา กรอง เปลี่ยนสถานะ หรือลบประกาศในเบราว์เซอร์นี้
              </p>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อสิ่งของ สถานที่ หรือรหัส..."
                className="rounded-xl border border-[#E4D9F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#B9A0F8] md:col-span-1"
              />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-[#E4D9F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#B9A0F8]"
              >
                <option>ทั้งหมด</option>
                <option>ของหาย</option>
                <option>ของที่พบ</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-[#E4D9F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#B9A0F8]"
              >
                <option>ทั้งหมด</option>
                {[...new Set(reports.map(getReportStatus))].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            {filteredReports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
                <p className="text-4xl">📭</p>
                <h3 className="mt-3 font-bold">ไม่พบประกาศ</h3>
                <p className="mt-2 text-sm text-[#8B7D94]">
                  ลองเปลี่ยนคำค้นหา หรือตรวจสอบว่าหน้าแจ้งประกาศบันทึกข้อมูลลง
                  findly_reports แล้วหรือไม่
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-[#EEE6F5] bg-white">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#F5F0FF] text-[#756581]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">สิ่งของ</th>
                      <th className="px-5 py-4 font-semibold">ประเภท</th>
                      <th className="px-5 py-4 font-semibold">สถานที่</th>
                      <th className="px-5 py-4 font-semibold">วันที่</th>
                      <th className="px-5 py-4 font-semibold">สถานะ</th>
                      <th className="px-5 py-4 font-semibold">จัดการ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0EAF5]">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-[#FFFCFF]">
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {getReportName(report)}
                          </p>
                          <p className="mt-1 text-xs text-[#8B7D94]">
                            ID: {report.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {getReportType(report)}
                        </td>

                        <td className="px-5 py-4">
                          {report.location || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {formatDate(report.date || report.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`เปลี่ยนสถานะ ${getReportName(report)}`}
                            value={getReportStatus(report)}
                            onChange={(event) =>
                              updateReportStatus(report.id, event.target.value)
                            }
                            className="max-w-40 rounded-lg border border-[#E4D9F0] bg-white px-2 py-2 text-xs outline-none focus:border-[#B9A0F8]"
                          >
                            {[...new Set([
                              "รอดำเนินการ",
                              "กำลังตรวจสอบ",
                              "กำลังดำเนินการ",
                              "เสร็จสิ้น",
                              getReportStatus(report),
                            ])].map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => deleteReport(report.id)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            ลบประกาศ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Issues */}
        {activeTab === "issues" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">จัดการรายงานปัญหา</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                ตรวจสอบรายงานและอัปเดตสถานะการดำเนินงาน
              </p>
            </div>

            {issues.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
                <p className="text-4xl">🛡️</p>
                <h3 className="mt-3 font-bold">ยังไม่มีรายงานปัญหา</h3>
                <p className="mt-2 text-sm text-[#8B7D94]">
                  ข้อมูลจะแสดงเมื่อระบบรายงานปัญหาบันทึกรายการลง{" "}
                  <code>findly_issues</code>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-3xl border border-[#EEE6F5] bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-bold">{issue.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#8B7D94]">
                          {issue.description}
                        </p>
                        <p className="mt-2 text-xs text-[#A79BAF]">
                          {formatDate(issue.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`สถานะรายงาน ${issue.title}`}
                          value={issue.status}
                          onChange={(event) =>
                            updateIssueStatus(issue.id, event.target.value)
                          }
                          className="rounded-xl border border-[#E4D9F0] bg-white px-3 py-2 text-sm"
                        >
                          <option>รอดำเนินการ</option>
                          <option>กำลังตรวจสอบ</option>
                          <option>ดำเนินการแล้ว</option>
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">จัดการผู้ใช้</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">
                แสดงข้อมูลผู้ใช้ที่มีอยู่ในเบราว์เซอร์นี้
              </p>
            </div>

            {users.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
                <p className="text-4xl">👥</p>
                <h3 className="mt-3 font-bold">ยังไม่มีข้อมูลผู้ใช้</h3>
                <p className="mt-2 text-sm text-[#8B7D94]">
                  หน้านี้จะอ่านข้อมูลจาก <code>findly_users</code> หากระบบสมัครสมาชิก
                  ยังไม่ได้บันทึกข้อมูลในรูปแบบนี้ รายการจะยังไม่แสดง
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-[#EEE6F5] bg-white">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-[#F5F0FF] text-[#756581]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">ผู้ใช้</th>
                      <th className="px-5 py-4 font-semibold">อีเมล</th>
                      <th className="px-5 py-4 font-semibold">บทบาท</th>
                      <th className="px-5 py-4 font-semibold">สถานะ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0EAF5]">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-5 py-4 font-semibold">{user.name}</td>
                        <td className="px-5 py-4">{user.email}</td>
                        <td className="px-5 py-4">{user.role || "ผู้ใช้"}</td>
                        <td className="px-5 py-4">{user.status || "ใช้งาน"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              ⚠️ หน้านี้ยังไม่ใช่ระบบบริหารผู้ใช้จริง และยังไม่มีการตรวจสอบสิทธิ์
              ผู้ดูแล การจัดการบัญชีจริงต้องทำผ่านฐานข้อมูลและระบบยืนยันตัวตน
            </div>
          </section>
        )}

        {/* Footer note */}
        <footer className="mt-10 rounded-2xl border border-[#E8DDFB] bg-[#F5F0FF] p-5">
          <h3 className="font-bold">💡 หมายเหตุสำหรับการพัฒนา</h3>
          <p className="mt-2 text-sm leading-6 text-[#756581]">
            หน้านี้เป็น Admin Dashboard สำหรับทดสอบบนเครื่องของคุณเท่านั้น
            การเปลี่ยนสถานะและลบประกาศจะเขียนข้อมูลลง localStorage ของเบราว์เซอร์นี้
            ยังไม่มีระบบล็อกอินผู้ดูแล การกำหนดสิทธิ์ หรือฐานข้อมูลส่วนกลาง
            ก่อนนำไปใช้งานจริงต้องเพิ่มระบบเหล่านี้เพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
          </p>
        </footer>
      </div>
    </main>
  );
}