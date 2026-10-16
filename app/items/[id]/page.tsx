"use client";
import { SAMPLE_ITEMS as SHARED_SAMPLE_ITEMS } from "../../../lib/sample-items";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  calculateSmartMatch,
  findSmartMatches,
  type MatchReport,
} from "../../../lib/smart-match";

type ItemType = "lost" | "found";

type SavedReport = {
  id: string;
  type: ItemType;
  name: string;
  category: string;
  color: string;
  brand: string;
  description: string;
  location: string;
  date: string;
  contact: string;
  image: string;
  createdAt: string;
  status?: string;
};

type Item = {
  id: string | number;
  name: string;
  category: string;
  type: ItemType;
  location: string;
  date: string;
  image: string;
  colorName: string;
  brand?: string;
  description?: string;
  contact?: string;
  status?: string;
};

type DisplayMatch = {
  report: MatchReport;
  score: number;
  reasons: string[];
  criteria: {
    key: string;
    label: string;
    weight: number;
    percentage: number | null;
    points: number;
    maxPoints: number;
    detail: string;
  }[];
};

const SAMPLE_ITEMS = SHARED_SAMPLE_ITEMS;

const CATEGORY_ICONS: Record<string, string> = {
  กระเป๋า: "🎒",
  กุญแจ: "🔑",
  อุปกรณ์อิเล็กทรอนิกส์: "📱",
  เสื้อผ้า: "👕",
  เอกสาร: "📄",
  เครื่องเขียน: "✏️",
  อื่นๆ: "📦",
  "อื่น ๆ": "📦",
};

function toMatchReport(item: Item): MatchReport {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    category: item.category,
    color: item.colorName,
    brand: item.brand ?? "",
    description: item.description ?? "",
    location: item.location,
    date: item.date,
  };
}

function normalizeSavedReport(report: SavedReport): Item {
  return {
    id: report.id,
    name: report.name,
    category: report.category || "อื่น ๆ",
    type: report.type,
    location: report.location || "ไม่ระบุสถานที่",
    date: report.date || "ไม่ระบุวันที่",
    image: report.image || "",
    colorName: report.color || "ไม่ระบุสี",
    brand: report.brand || "",
    description: report.description || "",
    contact: report.contact || "",
    status: report.status || "",
  };
}

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || "📦";
}

function getTypeLabel(type: ItemType): string {
  return type === "lost" ? "ของหาย" : "พบของ";
}

function getCriterionIcon(key: string): string {
  const icons: Record<string, string> = {
    category: "▦",
    name: "✦",
    color: "◉",
    brand: "◇",
    location: "⌖",
    date: "◷",
  };

  return icons[key] || "•";
}

function getScoreLevel(score: number): {
  label: string;
  className: string;
} {
  if (score >= 75) {
    return {
      label: "ตรงกันมาก",
      className: "score-high",
    };
  }

  if (score >= 45) {
    return {
      label: "มีความคล้ายคลึง",
      className: "score-medium",
    };
  }

  return {
    label: "ตรงกันบางส่วน",
    className: "score-low",
  };
}

function getImageUrl(image: string): string {
  if (!image.trim()) return "";

  if (
    image.startsWith("https://") ||
    image.startsWith("http://") ||
    image.startsWith("/") ||
    image.startsWith("data:image/")
  ) {
    return image;
  }

  return "";
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const itemId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DisplayMatch | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimContact, setClaimContact] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    function loadReports() {
      try {
        const stored = localStorage.getItem("findly_reports");

        let savedItems: Item[] = [];

        if (stored) {
          const parsed: unknown = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            savedItems = parsed
              .filter(
                (report): report is SavedReport =>
                  Boolean(
                    report &&
                      typeof report === "object" &&
                      "id" in report &&
                      "name" in report &&
                      "type" in report &&
                      (report.type === "lost" ||
                        report.type === "found")
                  )
              )
              .map(normalizeSavedReport);
          }
        }

        const savedIds = new Set(
          savedItems.map((item) => String(item.id))
        );

        const remainingSamples = SAMPLE_ITEMS.filter(
          (item) => !savedIds.has(String(item.id))
        );

        setItems([...savedItems, ...remainingSamples]);
      } catch (error) {
        console.error("Unable to load Findly reports:", error);
        setItems(SAMPLE_ITEMS);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();

    const handleStorage = () => loadReports();
    const handleFocus = () => loadReports();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const currentItem = useMemo(
    () => items.find((item) => String(item.id) === String(itemId)),
    [items, itemId]
  );

  const smartMatches = useMemo<DisplayMatch[]>(() => {
    if (!currentItem) return [];

    const currentReport = toMatchReport(currentItem);

    if (currentItem.type === "lost") {
      const reports = items
        .filter(
          (item) =>
            item.type === "found" &&
            String(item.id) !== String(currentItem.id)
        )
        .map(toMatchReport);

      return findSmartMatches(currentReport, reports, 20)
        .slice(0, 3)
        .map((match) => ({
          report: match.report,
          score: match.score,
          reasons: match.reasons,
          criteria: match.criteria,
        }));
    }

    return items
      .filter(
        (item) =>
          item.type === "lost" &&
          String(item.id) !== String(currentItem.id)
      )
      .map((item) => {
        const lostReport = toMatchReport(item);

        const result = calculateSmartMatch(
          lostReport,
          currentReport
        );

        return {
          report: lostReport,
          score: result.score,
          reasons: result.reasons,
          criteria: result.criteria,
        };
      })
      .filter((match) => match.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [items, currentItem]);

  if (isLoading) {
    return (
      <main className="detail-page loading-page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="loading-card">
          <div className="loading-spinner" />
          <p>กำลังเตรียมข้อมูลสิ่งของ...</p>
          <span>Findly · Lost & Found Hub</span>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  if (!currentItem) {
    return (
      <main className="detail-page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="not-found-card">
          <div className="not-found-icon">🔎</div>

          <p className="eyebrow">ITEM NOT FOUND</p>

          <h1>ไม่พบข้อมูลสิ่งของ</h1>

          <p className="not-found-description">
            รายการนี้อาจถูกลบ หรือไม่มีข้อมูลอยู่ในระบบ
            ลองกลับไปดูรายการสิ่งของทั้งหมดอีกครั้งนะ
          </p>

          <Link href="/items" className="primary-button">
            <span>←</span>
            กลับไปหน้ารายการสิ่งของ
          </Link>

          <style jsx global>{styles}</style>
        </div>
      </main>
    );
  }

  const currentImage = getImageUrl(currentItem.image);

  return (
    <main className="detail-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <div className="background-grid" />

      <div className="container">
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Findly หน้าหลัก">
            <span className="brand-icon">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="2"
                  width="36"
                  height="36"
                  rx="12"
                  fill="currentColor"
                />
                <path
                  d="M12 20.5L17.5 26L28.5 14"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="brand-word">
              <strong>Findly</strong>
              <small>LOST & FOUND HUB</small>
            </span>
          </Link>

          <Link href="/items" className="back-link">
            <span>←</span>
            <span>รายการสิ่งของ</span>
          </Link>
        </header>

        <section className="page-intro">
          <h1>
            รายละเอียด
            <span>สิ่งของ</span>
          </h1>

        </section>

        <section className="detail-card">
          <div className="photo-column">
            <div className="photo-frame">
              {currentImage ? (
                imageError ? (
                  <div className="photo-placeholder">
                    <span>{getCategoryIcon(currentItem.category)}</span>
                    <p>โหลดรูปภาพไม่สำเร็จ</p>
                    <button
                      type="button"
                      className="retry-image-button"
                      onClick={() => setImageError(false)}
                    >
                      ลองโหลดรูปอีกครั้ง
                    </button>
                  </div>
                ) : (
                  <img
                    key={`${currentItem.id}-${currentImage}`}
                    src={currentImage}
                    alt={`รูปภาพ${currentItem.name}`}
                    className="item-photo"
                    onError={() => setImageError(true)}
                  />
                )
              ) : (
                <div className="photo-placeholder">
                  <span>{getCategoryIcon(currentItem.category)}</span>
                  <p>รายการนี้ไม่ได้แนบรูปภาพ</p>
                </div>
              )}

              <div
                className={`photo-type-badge ${
                  currentItem.type === "lost"
                    ? "lost-badge"
                    : "found-badge"
                }`}
              >
                <span className="badge-dot" />
                {getTypeLabel(currentItem.type)}
              </div>
            </div>
          </div>

          <div className="info-column">
            <div className="info-topline">
              <span className="section-label">
                ITEM INFORMATION
              </span>

              <span className="item-id">
                ID #{String(currentItem.id)}
              </span>
            </div>

            <h2 className="item-title">{currentItem.name}</h2>

            <div className="item-category">
              <span className="category-icon">
                {getCategoryIcon(currentItem.category)}
              </span>

              <span>
                <small>หมวดหมู่</small>
                <strong>{currentItem.category || "ไม่ระบุ"}</strong>
              </span>
            </div>

            <div className="info-divider" />

            <div className="info-list">
              <div className="info-row">
                <span className="info-icon location-icon">⌖</span>

                <div className="info-content">
                  <span className="info-label">สถานที่</span>
                  <strong>
                    {currentItem.location || "ไม่ระบุสถานที่"}
                  </strong>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon date-icon">◷</span>

                <div className="info-content">
                  <span className="info-label">วันที่</span>
                  <strong>
                    {currentItem.date || "ไม่ระบุวันที่"}
                  </strong>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon color-icon">◉</span>

                <div className="info-content">
                  <span className="info-label">สี</span>
                  <strong>
                    {currentItem.colorName || "ไม่ระบุสี"}
                  </strong>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon status-icon">●</span>
                <div className="info-content">
                  <span className="info-label">สถานะ</span>
                  <strong>{currentItem.status?.trim() || (currentItem.type === "lost" ? "กำลังตามหา" : "พบสิ่งของแล้ว")}</strong>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon brand-icon">◇</span>
                <div className="info-content">
                  <span className="info-label">ยี่ห้อ</span>
                  <strong>{currentItem.brand?.trim() || "ไม่ได้ระบุ"}</strong>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon description-icon">☰</span>
                <div className="info-content">
                  <span className="info-label">รายละเอียดเพิ่มเติม</span>
                  <strong>{currentItem.description?.trim() || "ไม่ได้ระบุ"}</strong>
                </div>
              </div>

              {currentItem.contact?.trim() && (
                <div className="info-row">
                  <span className="info-icon contact-icon">☎</span>
                  <div className="info-content">
                    <span className="info-label">ช่องทางติดต่อ</span>
                    <strong>{currentItem.contact}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="info-divider bottom-divider" />

            <div className="action-buttons">
              {currentItem.type === "lost" ? (
                <Link
                  href={`/items/${encodeURIComponent(String(currentItem.id))}/clue`}
                  className="primary-button"
                >
                  แจ้งเบาะแส
                  <span className="button-arrow">→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setClaimModalOpen(true);
                    setClaimSubmitted(false);
                  }}
                >
                  แสดงความเป็นเจ้าของ
                  <span className="button-arrow">→</span>
                </button>
              )}

              <Link href="/items" className="secondary-button">
                รายการทั้งหมด
              </Link>
            </div>
          </div>
        </section>

        <section className="match-section">
          <div className="match-heading">
            <div className="match-heading-main">
              <div>
                <p className="section-label">SMART MATCH</p>
                <h2>รายการที่อาจตรงกัน</h2>
              </div>
            </div>
            <span className="match-count">{smartMatches.length} รายการ</span>
          </div>

          {smartMatches.length > 0 ? (
            <div className="compact-match-grid">
              {smartMatches.map((match) => {
                const matchedItem = items.find((item) => String(item.id) === String(match.report.id));
                const matchImage = getImageUrl(matchedItem?.image || "");
                const matchedCriteria = match.criteria
                  .filter((criterion) => criterion.percentage !== null && criterion.percentage >= 60)
                  .slice(0, 2)
                  .map((criterion) => criterion.label);

                return (
                  <button
                    key={`${currentItem.id}-${match.report.type}-${match.report.id}`}
                    type="button"
                    className="compact-match-card"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <span className="compact-match-image">
                      {matchImage ? (
                        <img src={matchImage} alt={match.report.name} loading="lazy" />
                      ) : (
                        getCategoryIcon(match.report.category || "อื่น ๆ")
                      )}
                    </span>
                    <span className="compact-match-content">
                      <span className={`mini-type-badge ${match.report.type === "lost" ? "mini-lost" : "mini-found"}`}>
                        {match.report.type === "lost" ? "ของหาย" : "พบของ"}
                      </span>
                      <strong className="compact-match-title">{match.report.name}</strong>
                      <span className="compact-match-meta">{match.report.category || "ไม่ระบุหมวดหมู่"}</span>
                      <span className="compact-match-reasons">
                        {matchedCriteria.length ? matchedCriteria.join(" · ") : "ข้อมูลใกล้เคียงบางส่วน"}
                      </span>
                    </span>
                    <span className="compact-match-score">
                      <strong>{match.score}%</strong>
                      <small>ตรงกัน</small>
                      <span>ดูต่อ →</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-match">
              <h3>ยังไม่พบรายการที่ตรงกัน</h3>
              <Link href="/items" className="empty-button">ดูรายการทั้งหมด →</Link>
            </div>
          )}
        </section>

        {selectedMatch && (
          <div className="findly-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMatch(null); }}>
            <section className="findly-modal match-detail-modal" role="dialog" aria-modal="true" aria-labelledby="match-detail-title">
              <button type="button" className="modal-close" aria-label="ปิด" onClick={() => setSelectedMatch(null)}>×</button>
              <p className="section-label">SMART MATCH</p>
              <h2 id="match-detail-title">{selectedMatch.report.name}</h2>
              <div className="modal-score">{selectedMatch.score}% <span>ตรงกัน</span></div>
              <div className="modal-criteria-list">
                {selectedMatch.criteria.map((criterion) => (
                  <div className="modal-criterion" key={criterion.key}>
                    <div className="modal-criterion-top">
                      <strong>{criterion.label}</strong>
                      <span>{criterion.percentage === null ? "—" : `${criterion.percentage}%`}</span>
                    </div>
                    <div className="criterion-track">
                      <div className="criterion-fill" style={{ width: `${criterion.percentage ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link className="primary-button modal-primary" href={`/items/${encodeURIComponent(String(selectedMatch.report.id))}`}>ดูรายการนี้ →</Link>
            </section>
          </div>
        )}

        {claimModalOpen && (
          <div className="findly-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClaimModalOpen(false); }}>
            <section className="findly-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title">
              <button type="button" className="modal-close" aria-label="ปิด" onClick={() => setClaimModalOpen(false)}>×</button>
              {claimSubmitted ? (
                <div className="claim-success">
                  <h2 id="claim-title">ส่งข้อมูลแล้ว</h2>
                  <button type="button" className="primary-button modal-primary" onClick={() => setClaimModalOpen(false)}>ปิด</button>
                </div>
              ) : (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    const existing = JSON.parse(localStorage.getItem("findly_claims") || "[]");
                    const claims = Array.isArray(existing) ? existing : [];
                    claims.push({ itemId: String(currentItem.id), itemName: currentItem.name, contact: claimContact.trim(), details: claimDetails.trim(), createdAt: new Date().toISOString() });
                    localStorage.setItem("findly_claims", JSON.stringify(claims));
                    setClaimSubmitted(true);
                  } catch (error) {
                    console.error("Unable to save ownership request:", error);
                  }
                }}>
                  <p className="section-label">OWNER VERIFICATION</p>
                  <h2 id="claim-title">ยืนยันความเป็นเจ้าของ</h2>
                  <label className="claim-label">ช่องทางติดต่อ<input required value={claimContact} onChange={(event) => setClaimContact(event.target.value)} placeholder="เบอร์โทรหรืออีเมล" /></label>
                  <label className="claim-label">รายละเอียดที่ใช้ยืนยัน<textarea required rows={3} value={claimDetails} onChange={(event) => setClaimDetails(event.target.value)} placeholder="ระบุลักษณะเฉพาะของสิ่งของ" /></label>
                  <button type="submit" className="primary-button modal-primary">ส่งข้อมูล</button>
                </form>
              )}
            </section>
          </div>
        )}

        <footer className="page-footer">
          <Link href="/" className="footer-brand">
            <span className="footer-brand-icon">✓</span>
            Findly
          </Link>

          <Link href="/items" className="footer-link">
            รายการสิ่งของทั้งหมด →
          </Link>
        </footer>
      </div>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .detail-page {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    padding: 0 24px;
    color: #29243b;
    background:
      radial-gradient(ellipse at 0% 0%, rgba(222, 210, 255, 0.68), transparent 34%),
      radial-gradient(ellipse at 100% 16%, rgba(255, 219, 232, 0.48), transparent 32%),
      radial-gradient(ellipse at 70% 78%, rgba(232, 222, 255, 0.38), transparent 35%),
      linear-gradient(150deg, #fcfaff 0%, #fffaf5 48%, #f7f3ff 100%);
  }

  .detail-page > .container,
  .loading-card,
  .not-found-card {
    position: relative;
    z-index: 2;
  }

  .ambient {
    position: absolute;
    z-index: -1;
    pointer-events: none;
    border-radius: 50%;
    filter: blur(2px);
  }

  .ambient-one {
    width: 400px;
    height: 400px;
    top: 280px;
    left: -230px;
    background: rgba(205, 186, 255, 0.23);
    filter: blur(55px);
  }

  .ambient-two {
    width: 440px;
    height: 440px;
    top: 850px;
    right: -250px;
    background: rgba(255, 204, 223, 0.25);
    filter: blur(65px);
  }

  .ambient-three {
    width: 280px;
    height: 280px;
    top: 1450px;
    left: 18%;
    background: rgba(215, 202, 255, 0.18);
    filter: blur(65px);
  }

  .background-grid {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.2;
    background-image: radial-gradient(#b6a5d7 0.7px, transparent 0.7px);
    background-size: 25px 25px;
    mask-image: linear-gradient(to bottom, black, transparent 80%);
  }

  .container {
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;
  }

  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 25px 0;
    border-bottom: 1px solid rgba(112, 91, 150, 0.12);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: #302744;
    text-decoration: none;
  }

  .brand-icon {
    display: flex;
    width: 42px;
    height: 42px;
    color: #8065d3;
  }

  .brand-icon svg {
    width: 100%;
    height: 100%;
  }

  .brand-word {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .brand-word strong {
    font-size: 22px;
    font-weight: 850;
    letter-spacing: -0.8px;
  }

  .brand-word small {
    color: #958ba8;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 1.45px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 11px 16px;
    border: 1px solid rgba(117, 96, 159, 0.16);
    border-radius: 13px;
    color: #65577f;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 3px 12px rgba(69, 47, 112, 0.03);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .back-link:hover {
    color: #7257c6;
    border-color: #c7b5f3;
    background: #fff;
    transform: translateY(-1px);
  }

  .back-link > span:first-child {
    font-size: 18px;
  }

  .page-intro {
    padding: 43px 0 27px;
  }

  .intro-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid rgba(132, 102, 201, 0.16);
    border-radius: 999px;
    color: #8064b9;
    background: rgba(255, 255, 255, 0.65);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.2px;
  }

  .intro-pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #9272df;
    box-shadow: 0 0 0 4px rgba(146, 114, 223, 0.12);
  }

  .page-intro h1 {
    margin: 17px 0 10px;
    color: #2f2545;
    font-size: clamp(31px, 4vw, 43px);
    font-weight: 850;
    letter-spacing: -1.8px;
    line-height: 1.2;
  }

  .page-intro h1 span {
    margin-left: 10px;
    color: #8a6bd5;
  }

  .page-intro > p {
    margin: 0;
    color: #8c849d;
    font-size: 14px;
    line-height: 1.8;
  }

  .detail-card {
    display: grid;
    grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
    gap: 32px;
    width: 100%;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 20px 60px rgba(77, 54, 119, 0.075),
      0 3px 12px rgba(77, 54, 119, 0.025),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(18px);
  }

  .photo-column {
    min-width: 0;
  }

  .photo-frame {
    position: relative;
    display: flex;
    min-height: 380px;
    aspect-ratio: 4 / 4.2;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgba(139, 113, 190, 0.12);
    border-radius: 19px;
    background:
      radial-gradient(circle at 20% 15%, #fff 0%, transparent 35%),
      linear-gradient(145deg, #f2ecff, #fbf1f6 55%, #f6f0ff);
  }

  .item-photo {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 380px;
    position: absolute;
    inset: 0;
    object-fit: cover;
  }

  .photo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #9582bf;
  }

  .photo-placeholder > span {
    font-size: 72px;
  }

  .photo-placeholder p {
    margin: 0;
    color: #9b90ac;
    font-size: 13px;
  }

  .retry-image-button {
    margin-top: 4px;
    padding: 9px 14px;
    border: 1px solid #d9caf5;
    border-radius: 10px;
    background: #ffffff;
    color: #7657c8;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .retry-image-button:hover {
    background: #f5f0ff;
  }

  .photo-type-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 13px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 4px 18px rgba(36, 24, 61, 0.09);
    font-size: 12px;
    font-weight: 800;
    backdrop-filter: blur(8px);
  }

  .lost-badge {
    color: #c36b7d;
  }

  .found-badge {
    color: #398b70;
  }

  .badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .photo-caption {
    position: absolute;
    right: 12px;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 13px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    color: white;
    background: rgba(41, 31, 58, 0.48);
    font-size: 11px;
    font-weight: 650;
    backdrop-filter: blur(12px);
  }

  .caption-icon {
    color: #e3d4ff;
    font-size: 15px;
  }

  .photo-tip {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 15px;
    padding: 13px 14px;
    border: 1px solid #eee7fb;
    border-radius: 13px;
    background: #faf8ff;
  }

  .tip-icon {
    flex-shrink: 0;
    color: #9276cc;
    font-size: 17px;
  }

  .photo-tip p {
    margin: 0;
    color: #8a819b;
    font-size: 11px;
    line-height: 1.8;
  }

  .info-column {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 5px 1px;
  }

  .info-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .section-label {
    color: #9a83c7;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.45px;
  }

  .item-id {
    padding: 6px 9px;
    border: 1px solid #eee8f7;
    border-radius: 8px;
    color: #a197b2;
    background: #fcfaff;
    font-size: 10px;
    font-weight: 750;
  }

  .item-title {
    margin: 20px 0 10px;
    color: #332747;
    font-size: clamp(25px, 3vw, 32px);
    font-weight: 850;
    letter-spacing: -0.8px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .item-description {
    margin: 0;
    color: #92899f;
    font-size: 13px;
    line-height: 1.9;
    overflow-wrap: anywhere;
  }

  .item-category {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 23px;
    padding: 13px;
    border: 1px solid #f0eaf9;
    border-radius: 14px;
    background: linear-gradient(110deg, #faf7ff, #fffafd);
  }

  .category-icon {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid #eee5fc;
    border-radius: 12px;
    background: white;
    font-size: 21px;
  }

  .item-category > span:last-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-category small {
    color: #a197b0;
    font-size: 10px;
  }

  .item-category strong {
    color: #5c4d78;
    font-size: 13px;
    font-weight: 800;
  }

  .info-divider {
    height: 1px;
    margin: 22px 0;
    background: linear-gradient(
      to right,
      rgba(218, 205, 241, 0.75),
      rgba(240, 231, 246, 0.2)
    );
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .info-icon {
    display: flex;
    width: 35px;
    height: 35px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    font-size: 20px;
  }

  .location-icon {
    color: #8b6bd2;
    background: #f2ecff;
  }

  .date-icon {
    color: #c0789b;
    background: #fff0f6;
  }

  .color-icon {
    color: #a48a52;
    background: #fff8e8;
  }

  .brand-icon {
    color: #5b9b88;
    background: #eaf8f2;
  }

  .description-icon {
    color: #64748b;
    background: #eef2f6;
  }

  .info-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
    padding-top: 1px;
  }

  .info-label {
    color: #a29aae;
    font-size: 11px;
  }

  .info-content strong {
    color: #514461;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .bottom-divider {
    margin: 22px 0 18px;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .primary-button,
  .secondary-button {
    display: flex;
    width: 100%;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    text-decoration: none;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .primary-button {
    color: white;
    border: 1px solid #8165d0;
    background: linear-gradient(115deg, #9072dd, #7657c8);
    box-shadow: 0 7px 18px rgba(126, 94, 200, 0.19);
  }

  .primary-button:hover {
    transform: translateY(-2px);
    background: linear-gradient(115deg, #9a7de4, #8060d3);
    box-shadow: 0 11px 25px rgba(126, 94, 200, 0.27);
  }

  .button-icon {
    font-size: 16px;
  }

  .button-arrow {
    margin-left: auto;
    font-size: 18px;
  }

  .secondary-button {
    color: #76638e;
    border: 1px solid #e8dff5;
    background: white;
  }

  .secondary-button:hover {
    transform: translateY(-1px);
    border-color: #cbb9f0;
    background: #faf7ff;
  }

  .action-caption {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 13px 0 0;
    color: #a49bb1;
    font-size: 10px;
    text-align: center;
  }

  .match-section {
    width: 100%;
    margin-top: 35px;
    padding: 28px;
    border: 1px solid rgba(255, 255, 255, 0.96);
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 20px 60px rgba(77, 54, 119, 0.07),
      0 3px 12px rgba(77, 54, 119, 0.025);
    backdrop-filter: blur(18px);
  }

  .match-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .match-heading-main {
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 0;
  }

  .match-symbol {
    display: flex;
    width: 53px;
    height: 53px;
    flex-shrink: 0;
  }

  .match-symbol svg {
    width: 100%;
    height: 100%;
  }

  .match-heading-main .section-label {
    margin: 0 0 5px;
  }

  .match-heading-main h2 {
    margin: 0;
    color: #332747;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: -0.6px;
  }

  .match-subtitle {
    margin: 6px 0 0;
    color: #9990a6;
    font-size: 12px;
    line-height: 1.8;
  }

  .match-count {
    display: flex;
    min-width: 94px;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 11px;
    border: 1px solid #eee5fc;
    border-radius: 14px;
    background: linear-gradient(135deg, #f7f1ff, #fff7fb);
  }

  .match-count > span {
    color: #7d60c7;
    font-size: 25px;
    font-weight: 850;
    line-height: 1;
  }

  .match-count small {
    color: #9e91b6;
    font-size: 10px;
  }

  .match-explainer {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin: 23px 0;
    padding: 14px 16px;
    border: 1px solid #eee6fb;
    border-radius: 14px;
    background: linear-gradient(105deg, #faf7ff, #fffafd);
  }

  .explainer-icon {
    flex-shrink: 0;
    color: #9678d5;
    font-size: 21px;
    line-height: 1.4;
  }

  .match-explainer p {
    margin: 0;
    color: #8a819c;
    font-size: 12px;
    line-height: 1.9;
  }

  .match-explainer strong {
    color: #7255bb;
  }

  .match-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
  }

  .match-card {
    width: 100%;
    min-width: 0;
    padding: 23px;
    border: 1px solid #eee7f7;
    border-radius: 20px;
    background: linear-gradient(150deg, #ffffff, #fefcff);
    box-shadow: 0 5px 18px rgba(70, 48, 111, 0.035);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .match-card:hover {
    border-color: #ddd0f4;
    box-shadow: 0 12px 30px rgba(70, 48, 111, 0.075);
    transform: translateY(-2px);
  }

  .match-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f0ebf7;
  }

  .match-item-preview {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 17px;
  }

  .match-thumb {
    display: flex;
    width: 104px;
    height: 104px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #eee5f8;
    border-radius: 16px;
    background: linear-gradient(140deg, #f1ebff, #fff1f7);
    font-size: 35px;
  }

  .match-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .match-item-info {
    min-width: 0;
    flex: 1;
  }

  .match-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px;
    margin-bottom: 9px;
  }

  .mini-type-badge,
  .match-category {
    display: inline-flex;
    align-items: center;
    padding: 5px 8px;
    border-radius: 7px;
    font-size: 10px;
    font-weight: 750;
  }

  .mini-lost {
    color: #bd6c81;
    background: #fff0f4;
  }

  .mini-found {
    color: #43866f;
    background: #eaf8f1;
  }

  .match-category {
    color: #88799f;
    background: #f5f0fb;
  }

  .match-item-info h3 {
    margin: 0 0 11px;
    color: #3a2d4f;
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -0.4px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .match-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 16px;
  }

  .match-meta span {
    color: #958ba4;
    font-size: 11px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .match-meta b {
    color: #a08acb;
    font-size: 14px;
  }

  .score-panel {
    display: flex;
    width: 136px;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 15px 13px;
    border: 1px solid #e9e0f7;
    border-radius: 17px;
    background: linear-gradient(150deg, #f8f3ff, #fff8fc);
  }

  .score-number {
    color: #7f60c9;
    font-size: 38px;
    font-weight: 900;
    letter-spacing: -1.5px;
    line-height: 1;
  }

  .score-number span {
    margin-left: 2px;
    font-size: 19px;
  }

  .score-level {
    color: #8874af;
    font-size: 10px;
    font-weight: 800;
  }

  .score-track {
    width: 100%;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: #e9e0f5;
  }

  .score-track-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #b69ce9, #8060cd);
  }

  .score-high .score-number {
    color: #4d9c7c;
  }

  .score-high .score-level {
    color: #438d6e;
  }

  .score-high .score-track-fill {
    background: linear-gradient(90deg, #9ed9bc, #4baf85);
  }

  .score-high .score-track {
    background: #e0f3e9;
  }

  .score-medium .score-number {
    color: #9b78d2;
  }

  .score-medium .score-level {
    color: #8a6abd;
  }

  .score-low .score-number {
    color: #bc8298;
  }

  .score-low .score-level {
    color: #ad7a8e;
  }

  .match-breakdown {
    padding-top: 20px;
  }

  .breakdown-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .breakdown-heading > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .breakdown-star {
    color: #9878d4;
    font-size: 18px;
  }

  .breakdown-heading strong {
    color: #56466f;
    font-size: 13px;
    font-weight: 850;
  }

  .weight-note {
    color: #a59ab5;
    font-size: 10px;
  }

  .criteria-list {
    display: flex;
    flex-direction: column;
    gap: 17px;
  }

  .criterion-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
  }

  .criterion-icon {
    display: flex;
    width: 33px;
    height: 33px;
    align-items: center;
    justify-content: center;
    border: 1px solid #ece4f8;
    border-radius: 10px;
    color: #9274ca;
    background: #f8f4ff;
    font-size: 17px;
  }

  .criterion-content {
    min-width: 0;
  }

  .criterion-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;
  }

  .criterion-label {
    color: #655875;
    font-size: 12px;
    font-weight: 800;
  }

  .criterion-percentage {
    flex-shrink: 0;
    color: #8062c2;
    font-size: 11px;
    font-weight: 850;
  }

  .criterion-track {
    width: 100%;
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: #f0ebf6;
  }

  .criterion-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #c9b5f2, #8768d0);
    transition: width 0.35s ease;
  }

  .criterion-fill-empty {
    background: #e9e2f1;
  }

  .criterion-detail {
    margin: 6px 0 0;
    color: #9a91a7;
    font-size: 10px;
    line-height: 1.7;
  }

  .criterion-points {
    display: flex;
    min-width: 83px;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    padding-top: 1px;
  }

  .criterion-points strong {
    color: #6d5a91;
    font-size: 14px;
    font-weight: 850;
  }

  .criterion-points span {
    color: #aaa0b8;
    font-size: 9px;
    white-space: nowrap;
  }

  .match-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 22px;
    padding: 17px;
    border: 1px solid #e6dbf8;
    border-radius: 15px;
    background: linear-gradient(105deg, #f6f1ff, #fff6fb);
  }

  .total-label {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .total-check {
    display: flex;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    color: #7e62c5;
    background: white;
    box-shadow: 0 2px 8px rgba(100, 70, 151, 0.07);
    font-size: 16px;
    font-weight: 900;
  }

  .total-label > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .total-label strong {
    color: #5b4977;
    font-size: 12px;
    font-weight: 850;
  }

  .total-label small {
    color: #a095b1;
    font-size: 10px;
    line-height: 1.6;
  }

  .total-score {
    flex-shrink: 0;
    color: #795ac3;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.6px;
  }

  .total-score span {
    margin-left: 3px;
    color: #a195b5;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .match-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #f0ebf7;
  }

  .match-card-footer > p {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin: 0;
    color: #a096ae;
    font-size: 10px;
    line-height: 1.8;
  }

  .match-card-footer > p span {
    color: #9a81ce;
    font-size: 14px;
  }

  .match-link {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 10px 14px;
    border: 1px solid #e8def7;
    border-radius: 11px;
    color: #795cc1;
    background: #faf7ff;
    font-size: 11px;
    font-weight: 850;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .match-link:hover {
    border-color: #cdb9f0;
    background: #f1eaff;
    transform: translateX(2px);
  }

  .match-link span {
    font-size: 16px;
  }

  .empty-match {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 35px 22px 39px;
    border: 1px dashed #e4d9f3;
    border-radius: 20px;
    background:
      radial-gradient(circle at 50% 20%, rgba(229, 215, 255, 0.27), transparent 42%),
      linear-gradient(145deg, #fdfbff, #fffafd);
    text-align: center;
  }

  .empty-illustration {
    position: relative;
    display: flex;
    width: 112px;
    height: 112px;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
  }

  .empty-orbit {
    position: absolute;
    border: 1px solid #e6dafa;
    border-radius: 50%;
  }

  .orbit-one {
    inset: 3px;
  }

  .orbit-two {
    inset: 14px;
    border-style: dashed;
    opacity: 0.8;
  }

  .empty-search {
    display: flex;
    width: 65px;
    height: 65px;
    align-items: center;
    justify-content: center;
    border: 1px solid #e8def8;
    border-radius: 22px;
    color: #9274d1;
    background: linear-gradient(145deg, white, #f6efff);
    box-shadow: 0 9px 22px rgba(103, 75, 155, 0.09);
    transform: rotate(-5deg);
  }

  .empty-search svg {
    width: 43px;
    height: 43px;
  }

  .empty-eyebrow {
    margin: 0 0 7px;
    color: #a08bc9;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 1.7px;
  }

  .empty-match h3 {
    margin: 0;
    color: #514164;
    font-size: 21px;
    font-weight: 850;
    letter-spacing: -0.4px;
  }

  .empty-description {
    max-width: 440px;
    margin: 10px 0 20px;
    color: #9a90a8;
    font-size: 12px;
    line-height: 2;
  }

  .empty-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    padding: 12px 17px;
    border: 1px solid #e6dcf6;
    border-radius: 12px;
    color: #785bbd;
    background: white;
    box-shadow: 0 4px 12px rgba(75, 48, 120, 0.04);
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .empty-button:hover {
    border-color: #cdb9f0;
    background: #f8f3ff;
    transform: translateY(-2px);
  }

  .empty-button span {
    font-size: 17px;
  }

  .match-footer-note {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 22px;
    padding: 16px 17px;
    border: 1px solid rgba(235, 225, 248, 0.8);
    border-radius: 14px;
    background: rgba(250, 247, 255, 0.72);
  }

  .footer-note-icon {
    flex-shrink: 0;
    color: #a286d8;
    font-size: 20px;
  }

  .match-footer-note p {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 0;
  }

  .match-footer-note strong {
    color: #796393;
    font-size: 12px;
    font-weight: 850;
  }

  .match-footer-note p span {
    color: #a39ab0;
    font-size: 10px;
    line-height: 1.8;
  }

  .page-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 13px;
    padding: 27px 0 35px;
    margin-top: 10px;
    border-top: 1px solid rgba(112, 91, 150, 0.12);
  }

  .footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #5d4a7b;
    font-size: 15px;
    font-weight: 850;
    text-decoration: none;
  }

  .footer-brand-icon {
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: white;
    background: #8c70d4;
    font-size: 12px;
  }

  .page-footer > p {
    margin: 0;
    color: #aaa1b5;
    font-size: 10px;
  }

  .footer-link {
    color: #8773b2;
    font-size: 11px;
    font-weight: 750;
    text-decoration: none;
  }

  .footer-link:hover {
    color: #6545b4;
  }

  .loading-page {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
  }

  .loading-card {
    display: flex;
    width: min(100%, 350px);
    flex-direction: column;
    align-items: center;
    padding: 40px 25px;
    border: 1px solid white;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 15px 50px rgba(77, 54, 119, 0.08);
  }

  .loading-spinner {
    width: 42px;
    height: 42px;
    border: 3px solid #eae2fa;
    border-top-color: #8868d0;
    border-radius: 50%;
    animation: findly-spin 0.8s linear infinite;
  }

  .loading-card p {
    margin: 20px 0 7px;
    color: #5f4d7b;
    font-size: 14px;
    font-weight: 800;
  }

  .loading-card > span {
    color: #a39ab3;
    font-size: 10px;
    letter-spacing: 0.6px;
  }

  @keyframes findly-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .not-found-card {
    width: min(100%, 520px);
    margin: 100px auto;
    padding: 42px 30px;
    border: 1px solid white;
    border-radius: 25px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 20px 60px rgba(77, 54, 119, 0.08);
    text-align: center;
  }

  .not-found-icon {
    display: flex;
    width: 72px;
    height: 72px;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    border: 1px solid #e8ddf8;
    border-radius: 23px;
    background: linear-gradient(145deg, #f5efff, #fff4f8);
    font-size: 34px;
  }

  .not-found-card .eyebrow {
    margin: 0 0 9px;
    color: #9a82ca;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.6px;
  }

  .not-found-card h1 {
    margin: 0;
    color: #382a4d;
    font-size: 27px;
    font-weight: 850;
  }

  .not-found-description {
    margin: 12px auto 23px;
    color: #968ba6;
    font-size: 13px;
    line-height: 1.9;
  }

  .not-found-card .primary-button {
    width: auto;
    display: inline-flex;
  }

  @media (min-width: 1200px) {
    .detail-page {
      padding-right: 32px;
      padding-left: 32px;
    }
  }

  @media (max-width: 800px) {
    .detail-page {
      padding-right: 18px;
      padding-left: 18px;
    }

    .detail-card {
      grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
      gap: 22px;
      padding: 19px;
    }

    .photo-frame,
    .item-photo {
      min-height: 310px;
    }

    .match-section {
      padding: 22px;
    }

    .match-card {
      padding: 18px;
    }

    .match-thumb {
      width: 85px;
      height: 85px;
    }

    .score-panel {
      width: 116px;
    }

    .score-number {
      font-size: 33px;
    }
  }

  @media (max-width: 600px) {
    .detail-page {
      padding-right: 14px;
      padding-left: 14px;
    }

    .site-header {
      padding: 17px 0;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
    }

    .brand-word strong {
      font-size: 20px;
    }

    .brand-word small {
      font-size: 8px;
    }

    .back-link {
      gap: 6px;
      padding: 9px 11px;
      font-size: 11px;
    }

    .page-intro {
      padding: 31px 0 22px;
    }

    .page-intro h1 {
      font-size: 32px;
      letter-spacing: -1.2px;
    }

    .page-intro > p {
      font-size: 12px;
    }

    .detail-card {
      grid-template-columns: minmax(0, 1fr);
      gap: 22px;
      padding: 14px;
      border-radius: 21px;
    }

    .photo-frame {
      min-height: 0;
      aspect-ratio: 1 / 0.86;
    }

    .item-photo {
      min-height: 0;
    }

    .photo-caption {
      font-size: 10px;
    }

    .photo-tip {
      margin-top: 10px;
    }

    .info-column {
      padding: 4px 3px 3px;
    }

    .item-title {
      margin-top: 15px;
      font-size: 27px;
    }

    .item-description {
      font-size: 12px;
    }

    .info-divider {
      margin: 17px 0;
    }

    .info-list {
      gap: 15px;
    }

    .match-section {
      margin-top: 23px;
      padding: 17px 13px;
      border-radius: 21px;
    }

    .match-heading {
      align-items: flex-start;
      gap: 10px;
    }

    .match-heading-main {
      gap: 10px;
    }

    .match-symbol {
      width: 42px;
      height: 42px;
    }

    .match-heading-main h2 {
      font-size: 18px;
      letter-spacing: -0.4px;
    }

    .match-heading-main .section-label {
      font-size: 9px;
    }

    .match-subtitle {
      font-size: 10px;
    }

    .match-count {
      min-width: 65px;
      padding: 9px 6px;
      border-radius: 12px;
    }

    .match-count > span {
      font-size: 22px;
    }

    .match-count small {
      font-size: 9px;
    }

    .match-explainer {
      gap: 8px;
      margin: 17px 0;
      padding: 11px;
    }

    .match-explainer p {
      font-size: 11px;
    }

    .match-list {
      gap: 15px;
    }

    .match-card {
      padding: 13px;
      border-radius: 17px;
    }

    .match-card-top {
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 15px;
    }

    .match-item-preview {
      align-items: flex-start;
      gap: 10px;
    }

    .match-thumb {
      width: 70px;
      height: 78px;
      border-radius: 11px;
      font-size: 25px;
    }

    .match-badges {
      gap: 5px;
      margin-bottom: 7px;
    }

    .mini-type-badge,
    .match-category {
      padding: 4px 6px;
      font-size: 9px;
    }

    .match-item-info h3 {
      margin-bottom: 7px;
      font-size: 14px;
      line-height: 1.5;
    }

    .match-meta {
      flex-direction: column;
      gap: 2px;
    }

    .match-meta span {
      font-size: 10px;
    }

    .score-panel {
      width: 78px;
      gap: 6px;
      padding: 11px 7px;
      border-radius: 12px;
    }

    .score-number {
      font-size: 26px;
      letter-spacing: -1px;
    }

    .score-number span {
      font-size: 13px;
    }

    .score-level {
      font-size: 8px;
      text-align: center;
    }

    .score-track {
      height: 4px;
    }

    .match-breakdown {
      padding-top: 15px;
    }

    .breakdown-heading {
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .breakdown-heading strong {
      font-size: 11px;
      line-height: 1.7;
    }

    .weight-note {
      font-size: 9px;
      white-space: nowrap;
    }

    .criteria-list {
      gap: 15px;
    }

    .criterion-row {
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 9px;
    }

    .criterion-icon {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      font-size: 15px;
    }

    .criterion-label {
      font-size: 11px;
    }

    .criterion-percentage {
      font-size: 10px;
    }

    .criterion-points {
      grid-column: 2;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      min-width: 0;
      margin-top: -2px;
    }

    .criterion-points strong {
      font-size: 11px;
    }

    .criterion-points span {
      font-size: 9px;
    }

    .criterion-detail {
      font-size: 10px;
    }

    .match-total {
      gap: 8px;
      margin-top: 17px;
      padding: 12px 10px;
    }

    .total-label {
      gap: 8px;
    }

    .total-check {
      width: 28px;
      height: 28px;
      border-radius: 9px;
    }

    .total-label strong {
      font-size: 10px;
      line-height: 1.6;
    }

    .total-label small {
      font-size: 9px;
    }

    .total-score {
      font-size: 22px;
    }

    .total-score span {
      font-size: 9px;
    }

    .match-card-footer {
      align-items: stretch;
      flex-direction: column;
      gap: 11px;
      margin-top: 14px;
      padding-top: 13px;
    }

    .match-card-footer > p {
      font-size: 10px;
    }

    .match-link {
      justify-content: center;
      padding: 11px;
    }

    .empty-match {
      padding: 27px 14px;
    }

    .empty-match h3 {
      font-size: 18px;
    }

    .empty-description {
      font-size: 11px;
    }

    .match-footer-note {
      margin-top: 15px;
      padding: 13px;
    }

    .page-footer {
      justify-content: center;
      flex-direction: column;
      padding: 23px 0 28px;
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Findly compact, low-clutter visual refresh */
  .detail-page {
    color: #30343b;
    background: #f5f5f2;
  }
  .ambient, .background-grid { display: none; }
  .site-header, .page-footer { border-color: #e2e5e3; }
  .brand, .brand-word strong, .page-intro h1, .item-title, .match-heading-main h2, .match-item-info h3 { color: #283747; }
  .brand-icon { color: #283747; }
  .brand-word small, .section-label { color: #6d827b; }
  .back-link { color: #354b49; border-color: #dfe5e1; background: #fff; box-shadow: none; }
  .back-link:hover { color: #283747; border-color: #9ab5aa; background: #fff; }
  .intro-pill { color: #42675e; border-color: #dce7e1; background: #fff; }
  .intro-pill-dot { background: #49766b; box-shadow: none; }
  .page-intro h1 span { color: #49766b; }
  .detail-card, .match-section { border-color: #e5e8e5; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px rgba(40,55,71,.06); backdrop-filter: none; }
  .photo-frame { border-color: #e2e5e3; background: #f0f1ed; }
  .photo-type-badge { box-shadow: none; }
  .item-id { color: #52605e; border-color: #e2e5e3; background: #f7f8f6; }
  .item-description, .info-label { color: #727a79; }
  .item-category { border-color: #e5e9e5; background: #f7f8f6; }
  .category-icon { border-color: #e2e5e3; }
  .item-category small { color: #737d78; }
  .item-category strong, .info-content strong { color: #303f3e; }
  .info-divider { background: #e7eae7; }
  .location-icon, .date-icon, .color-icon, .brand-icon, .status-icon, .contact-icon { color: #49766b; background: #edf4ef; }
  .primary-button { color: #fff; border: 1px solid #283747; background: #283747; box-shadow: none; cursor: pointer; }
  .primary-button:hover { background: #354c60; box-shadow: none; }
  .secondary-button { color: #354b49; border-color: #dfe5e1; background: #fff; }
  .secondary-button:hover { border-color: #a8c0b4; background: #f5f8f5; }
  .match-heading-main h2 { font-size: 22px; }
  .match-count { display: inline-flex; flex-direction: row; align-items: center; min-width: auto; padding: 8px 12px; color: #42675e; border: 1px solid #dce7e1; border-radius: 999px; background: #f2f6f2; font-size: 12px; font-weight: 700; }
  .compact-match-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 22px; }
  .compact-match-card { display: flex; min-width: 0; align-items: center; gap: 12px; padding: 13px; border: 1px solid #e2e7e3; border-radius: 15px; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
  .compact-match-card:hover { border-color: #9ab5aa; box-shadow: 0 7px 20px rgba(40,55,71,.07); transform: translateY(-2px); }
  .compact-match-image { display: flex; width: 76px; height: 82px; flex: 0 0 76px; align-items: center; justify-content: center; overflow: hidden; border-radius: 11px; background: #f0f2ee; font-size: 27px; }
  .compact-match-image img { width: 100%; height: 100%; object-fit: cover; }
  .compact-match-content { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; gap: 5px; }
  .compact-match-content .mini-type-badge { font-size: 9px; padding: 4px 7px; }
  .mini-lost { color: #9b604a; background: #f8eee8; }
  .mini-found { color: #356b59; background: #eaf3ed; }
  .compact-match-title { width: 100%; overflow: hidden; color: #283747; font-size: 13px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
  .compact-match-meta, .compact-match-reasons { color: #727a79; font-size: 10px; line-height: 1.5; }
  .compact-match-reasons { color: #49766b; }
  .compact-match-score { display: flex; flex: 0 0 62px; flex-direction: column; align-items: flex-end; gap: 4px; }
  .compact-match-score strong { color: #49766b; font-size: 20px; line-height: 1; }
  .compact-match-score small { color: #727a79; font-size: 9px; }
  .compact-match-score > span { margin-top: 5px; color: #283747; font-size: 10px; white-space: nowrap; }
  .empty-match { margin-top: 20px; padding: 28px 15px; border-color: #dfe5e1; background: #f8f9f6; }
  .empty-match h3 { margin-bottom: 12px; color: #354b49; }
  .empty-button { color: #283747; border-color: #dfe5e1; background: #fff; }
  .footer-brand { color: #283747; }
  .footer-brand-icon { background: #49766b; }
  .footer-link { color: #49766b; }
  .loading-card, .not-found-card { border-color: #e5e8e5; background: #fff; box-shadow: 0 8px 28px rgba(40,55,71,.06); }
  .loading-spinner { border-color: #e2e5e3; border-top-color: #49766b; }
  .loading-card p, .not-found-card h1 { color: #283747; }
  .findly-modal-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(24,35,43,.48); }
  .findly-modal { position: relative; width: min(100%, 470px); max-height: min(85vh, 760px); overflow: auto; padding: 27px; border: 1px solid #e2e5e3; border-radius: 20px; background: #fff; box-shadow: 0 22px 70px rgba(20,30,38,.2); }
  .findly-modal h2 { margin: 8px 0 18px; color: #283747; font-size: 23px; }
  .modal-close { position: absolute; top: 12px; right: 14px; width: 34px; height: 34px; border: 0; border-radius: 50%; color: #354b49; background: #f0f3f0; font-size: 24px; cursor: pointer; }
  .modal-score { margin-bottom: 20px; color: #49766b; font-size: 27px; font-weight: 850; }
  .modal-score span { color: #727a79; font-size: 12px; font-weight: 600; }
  .modal-criteria-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 22px; }
  .modal-criterion-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 7px; color: #354b49; font-size: 12px; }
  .modal-criterion-top span { color: #49766b; font-weight: 800; }
  .modal-criterion .criterion-track { background: #e8ede8; }
  .modal-criterion .criterion-fill { background: #49766b; }
  .modal-primary { margin-top: 8px; }
  .claim-label { display: flex; flex-direction: column; gap: 7px; margin: 14px 0; color: #354b49; font-size: 12px; font-weight: 700; }
  .claim-label input, .claim-label textarea { width: 100%; padding: 12px; border: 1px solid #dfe5e1; border-radius: 10px; color: #30343b; background: #fff; font: inherit; font-weight: 400; resize: vertical; }
  .claim-label input:focus, .claim-label textarea:focus { outline: 2px solid #a8c0b4; border-color: #49766b; }
  .claim-success { padding-top: 15px; text-align: center; }
  @media (max-width: 900px) { .compact-match-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 600px) {
    .compact-match-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .compact-match-card { padding: 11px; }
    .compact-match-image { width: 65px; height: 70px; flex-basis: 65px; }
    .compact-match-score { flex-basis: 56px; }
    .match-heading-main h2 { font-size: 19px; }
    .findly-modal { padding: 22px 17px; }
  }
`;