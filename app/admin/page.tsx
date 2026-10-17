"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

type Claim = {
  id: string;
  item_id: string;
  claimant_id: string;
  status: string;
  created_at?: string;
  itemName?: string;
  itemLocation?: string;
  itemType?: string;
};

type Tab = "overview" | "reports" | "claims" | "issues" | "users";

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
  const [claims, setClaims] = useState<Claim[]>([]);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [adminEmail, setAdminEmail] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      try {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          if (!cancelled) {
            setAccessState("denied");
            setLoaded(true);
          }
          return;
        }

        const { data: adminAllowed, error: adminError } = await supabase.rpc("is_findly_admin");
        if (adminError || adminAllowed !== true) {
          if (!cancelled) {
            setAccessState("denied");
            setLoaded(true);
          }
          return;
        }

        if (cancelled) return;
        setAdminEmail(authData.user.email || "");
        setAccessState("allowed");

        const [itemsResult, claimsResult] = await Promise.all([
          supabase
            .from("items")
            .select("id,name,category,type,location,date,image,status,description,created_at,created_by,color,brand,contact")
            .order("created_at", { ascending: false }),
          supabase
            .from("item_claims")
            .select("id,item_id,claimant_id,status,created_at")
            .order("created_at", { ascending: false }),
        ]);

        if (itemsResult.error) throw itemsResult.error;
        if (claimsResult.error) throw claimsResult.error;

        const items = itemsResult.data || [];
        const mappedReports: Report[] = items.map((item: any) => ({
          id: String(item.id),
          type: item.type,
          name: item.name,
          category: item.category,
          color: item.color,
          location: item.location,
          date: item.date,
          image: item.image,
          status: item.status || "active",
          description: item.description,
          createdAt: item.created_at,
          userName: item.created_by || "",
          email: item.contact || "",
        }));

        const itemMap = new Map(items.map((item: any) => [String(item.id), item]));
        const mappedClaims: Claim[] = (claimsResult.data || []).map((claim: any) => {
          const item: any = itemMap.get(String(claim.item_id));
          return {
            id: String(claim.id),
            item_id: String(claim.item_id),
            claimant_id: String(claim.claimant_id),
            status: claim.status || "pending",
            created_at: claim.created_at,
            itemName: item?.name || `รายการ #${claim.item_id}`,
            itemLocation: item?.location || "-",
            itemType: item?.type || "-",
          };
        });

        if (!cancelled) {
          setReports(mappedReports);
          setClaims(mappedClaims);
          // Issues and user lists are still demo-only because no Supabase tables were configured for them.
          setIssues(readArray<Issue>(ISSUES_KEY));
          setUsers(readArray<UserRecord>(USERS_KEY));
          setLoaded(true);
        }
      } catch (error) {
        console.error("Admin dashboard load failed:", error);
        if (!cancelled) {
          setNotice("โหลดข้อมูลจาก Supabase ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และการเชื่อมต่อ");
          setLoaded(true);
        }
      }
    }

    void loadAdminData();
    return () => { cancelled = true; };
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

  async function updateReportStatus(id: string, newStatus: string) {
    const statusMap: Record<string, string> = {
      "รอดำเนินการ": "active",
      "กำลังตรวจสอบ": "active",
      "กำลังดำเนินการ": "pending_return",
      "เสร็จสิ้น": "returned",
      "ปิดประกาศ": "closed",
    };
    const dbStatus = statusMap[newStatus] || newStatus;
    const supabase = createClient();
    const { error } = await supabase.from("items").update({ status: dbStatus }).eq("id", Number(id));
    if (error) {
      setNotice(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`);
      return;
    }
    setReports((current) => current.map((report) => report.id === id ? { ...report, status: dbStatus } : report));
    setNotice("บันทึกสถานะประกาศลง Supabase แล้ว");
  }

  async function deleteReport(id: string) {
    const confirmed = window.confirm("ต้องการปิดประกาศนี้หรือไม่? รายการจะไม่ถูกลบถาวร");
    if (!confirmed) return;
    await updateReportStatus(id, "ปิดประกาศ");
  }

  function updateIssueStatus(id: string, newStatus: string) {
    const updated = issues.map((issue) => issue.id === id ? { ...issue, status: newStatus } : issue);
    try {
      localStorage.setItem(ISSUES_KEY, JSON.stringify(updated));
      setIssues(updated);
      setNotice("อัปเดตสถานะรายงานปัญหาในเบราว์เซอร์แล้ว");
    } catch {
      setNotice("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  async function updateClaimStatus(claim: Claim, newStatus: "approved" | "rejected") {
    const confirmed = window.confirm(newStatus === "approved" ? "ยืนยันอนุมัติคำร้องแสดงความเป็นเจ้าของใช่หรือไม่?" : "ยืนยันปฏิเสธคำร้องนี้ใช่หรือไม่?");
    if (!confirmed) return;

    setNotice("");
    const supabase = createClient();
    const { data: updatedClaim, error } = await supabase
      .from("item_claims")
      .update({ status: newStatus })
      .eq("id", Number(claim.id))
      .select("id,status")
      .maybeSingle();

    if (error) {
      setNotice(`บันทึกผลคำร้องไม่สำเร็จ: ${error.message}`);
      return;
    }
    // Supabase may return no error when RLS prevents the update and zero rows match.
    if (!updatedClaim) {
      setNotice("ยังบันทึกสถานะไม่ได้: ไม่พบคำร้องที่แก้ไขได้ หรือสิทธิ์ RLS ไม่อนุญาต โปรดตรวจสอบนโยบาย UPDATE ของ item_claims และยืนยันว่าบัญชีนี้เป็น Admin");
      return;
    }

    if (newStatus === "approved") {
      const { data: updatedItem, error: itemError } = await supabase
        .from("items")
        .update({ status: "pending_return" })
        .eq("id", Number(claim.item_id))
        .select("id,status")
        .maybeSingle();

      if (itemError || !updatedItem) {
        setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, status: newStatus } : item));
        setNotice(`อนุมัติคำร้องแล้ว แต่เปลี่ยนสถานะสิ่งของไม่สำเร็จ${itemError ? `: ${itemError.message}` : ": ไม่พบรายการที่แก้ไขได้ หรือสิทธิ์ RLS ไม่อนุญาต"}`);
        return;
      }
      setReports((current) => current.map((report) => report.id === claim.item_id ? { ...report, status: "pending_return" } : report));
      setNotice("อนุมัติคำร้องแล้ว และเปลี่ยนสถานะสิ่งของเป็นรอนัดรับคืน");
    } else {
      setNotice("ปฏิเสธคำร้องและบันทึกลง Supabase แล้ว");
    }
    setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, status: newStatus } : item));
  }

  async function refreshData() {
    setLoaded(false);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setAccessState("denied");
        setLoaded(true);
        return;
      }
      const { data: allowed, error: roleError } = await supabase.rpc("is_findly_admin");
      if (roleError || allowed !== true) {
        setAccessState("denied");
        setLoaded(true);
        return;
      }
      const [{ data: items, error: itemsError }, { data: claimRows, error: claimsError }] = await Promise.all([
        supabase.from("items").select("id,name,category,type,location,date,image,status,description,created_at,created_by,color,brand,contact").order("created_at", { ascending: false }),
        supabase.from("item_claims").select("id,item_id,claimant_id,status,created_at").order("created_at", { ascending: false }),
      ]);
      if (itemsError) throw itemsError;
      if (claimsError) throw claimsError;
      const safeItems = items || [];
      setReports(safeItems.map((item: any) => ({ id: String(item.id), type: item.type, name: item.name, category: item.category, color: item.color, location: item.location, date: item.date, image: item.image, status: item.status || "active", description: item.description, createdAt: item.created_at, userName: item.created_by || "", email: item.contact || "" })));
      const itemMap = new Map(safeItems.map((item: any) => [String(item.id), item]));
      setClaims((claimRows || []).map((claim: any) => { const item: any = itemMap.get(String(claim.item_id)); return { id: String(claim.id), item_id: String(claim.item_id), claimant_id: String(claim.claimant_id), status: claim.status || "pending", created_at: claim.created_at, itemName: item?.name || `รายการ #${claim.item_id}`, itemLocation: item?.location || "-", itemType: item?.type || "-" }; }));
      setIssues(readArray<Issue>(ISSUES_KEY));
      setUsers(readArray<UserRecord>(USERS_KEY));
      setAccessState("allowed");
      setNotice("โหลดประกาศและคำร้องล่าสุดจาก Supabase แล้ว");
    } catch (error) {
      console.error(error);
      setNotice("โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoaded(true);
    }
  }

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "ภาพรวมระบบ", icon: "📊" },
    { id: "reports", label: "จัดการประกาศ", icon: "📦" },
    { id: "claims", label: "คำร้องเจ้าของ", icon: "🪪" },
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

  if (accessState !== "allowed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFAF7] px-4 text-[#493D55]">
        <section className="w-full max-w-lg rounded-3xl border border-[#EEE6F5] bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🔐</div>
          <h1 className="mt-4 text-2xl font-extrabold">ไม่สามารถเข้าถึง Admin Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-[#8B7D94]">กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์ผู้ดูแล Findly หากเพิ่มสิทธิ์แล้วแต่ยังเข้าไม่ได้ ให้ตรวจสอบว่ากำลังใช้บัญชีเดียวกัน</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#B9A0F8] px-5 py-3 text-sm font-bold text-[#493D55] hover:bg-[#AA8CEB]">ไปหน้าเข้าสู่ระบบ</Link>
        </section>
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
              ภาพรวมประกาศและคำร้องจากฐานข้อมูล Findly
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {adminEmail && <span className="text-xs text-[#8B7D94]">Admin: {adminEmail}</span>}
          <button
            type="button"
            onClick={refreshData}
            className="rounded-xl border border-[#DCCFF0] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#F5F0FF]"
          >
            ↻ โหลดข้อมูลล่าสุด
          </button>
          </div>
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
                สรุปประกาศที่อ่านได้จาก Supabase
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
                  รายการล่าสุดจากฐานข้อมูล Supabase
                </p>

                {reports.length === 0 ? (
                  <div className="mt-5 rounded-2xl bg-[#FAF7FF] p-6 text-center">
                    <p className="text-3xl">📭</p>
                    <p className="mt-2 font-semibold">ยังไม่มีประกาศ</p>
                    <p className="mt-1 text-sm text-[#8B7D94]">
                      เมื่อมีประกาศในตาราง items รายการจะแสดงที่นี่
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
                  สถานะข้อมูลที่เชื่อมต่ออยู่
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">ประกาศของหายและของที่พบ</span>
                    <span className="font-bold">{reports.length} รายการ</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">คำร้องแสดงความเป็นเจ้าของ</span>
                    <span className="font-bold">{claims.length} รายการ</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#FAF7FF] p-4">
                    <span className="text-sm">รายงานปัญหา (ข้อมูลตัวอย่าง)</span>
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
                    หน้านี้ยังไม่มีระบบยืนยันสิทธิ์ผู้ดูแล และส่วนรายงานปัญหาและรายชื่อผู้ใช้ยังเป็นข้อมูลตัวอย่างจากเบราว์เซอร์
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
                ค้นหา กรอง เปลี่ยนสถานะ หรือปิดประกาศใน Supabase
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
                  ลองเปลี่ยนคำค้นหา หรือตรวจสอบข้อมูลในตาราง items ของ Supabase
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
                              "active",
                              "pending_return",
                              "returned",
                              "closed",
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
                            ปิดประกาศ
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

        {/* Ownership claims */}
        {activeTab === "claims" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">คำร้องแสดงความเป็นเจ้าของ</h2>
              <p className="mt-1 text-sm text-[#8B7D94]">ตรวจสอบคำร้องที่บันทึกใน Supabase และอนุมัติหรือปฏิเสธคำร้อง</p>
            </div>
            {claims.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
                <p className="text-4xl">🪪</p><h3 className="mt-3 font-bold">ยังไม่มีคำร้อง</h3>
                <p className="mt-2 text-sm text-[#8B7D94]">คำร้องจากตาราง item_claims จะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => {
                  const status = (claim.status || "pending").toLowerCase();
                  const pending = ["pending", "submitted", "under_review"].includes(status);
                  return (
                    <article key={claim.id} className="rounded-3xl border border-[#EEE6F5] bg-white p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="min-w-0">
                          <h3 className="font-bold">{claim.itemName}</h3>
                          <p className="mt-1 text-sm text-[#8B7D94]">คำร้อง #{claim.id} · รายการ #{claim.item_id}</p>
                          <p className="mt-1 text-sm text-[#8B7D94]">สถานที่: {claim.itemLocation} · ประเภท: {getReportType({ id: String(claim.item_id), type: claim.itemType })}</p>
                          <p className="mt-1 break-all text-xs text-[#A79BAF]">ผู้ยื่นคำร้อง UID: {claim.claimant_id}</p>
                          <p className="mt-2 text-xs text-[#8B7D94]">ส่งคำร้องเมื่อ {formatDate(claim.created_at)} · สถานะ: <strong>{claim.status}</strong></p>
                        </div>
                        {pending ? (
                          <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => void updateClaimStatus(claim, "approved")} className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-200">อนุมัติ</button>
                            <button type="button" onClick={() => void updateClaimStatus(claim, "rejected")} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">ปฏิเสธ</button>
                          </div>
                        ) : <span className="rounded-full bg-[#F5F0FF] px-4 py-2 text-sm font-semibold">ดำเนินการแล้ว</span>}
                      </div>
                    </article>
                  );
                })}
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
                ข้อมูลตัวอย่างผู้ใช้จากเบราว์เซอร์นี้ (ยังไม่ได้เชื่อม Supabase)
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
            ประกาศและคำร้องแสดงความเป็นเจ้าของอ่านและแก้ไขผ่าน Supabase โดยตรวจสิทธิ์ผู้ดูแลจากฟังก์ชัน is_findly_admin ส่วนรายงานปัญหาและรายชื่อผู้ใช้ยังเป็นข้อมูลตัวอย่างใน localStorage และยังไม่ได้เชื่อมฐานข้อมูล
          </p>
        </footer>
      </div>
    </main>
  );
}