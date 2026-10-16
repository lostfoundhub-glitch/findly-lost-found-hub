"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type SavedReport = {
  id?: string | number;
  itemId?: string | number;
  name?: string;
  itemName?: string;
  title?: string;
  item_name?: string;
  [key: string]: unknown;
};

type Clue = {
  id: string;
  itemId: string;
  itemName: string;
  details: string;
  location: string;
  date: string;
  contact: string;
  createdAt: string;
};

const SAMPLE_ITEMS: Record<string, string> = {
  "1": "กระเป๋าสตางค์",
  "2": "โทรศัพท์มือถือ",
  "3": "กุญแจ",
  "4": "หูฟัง",
  "5": "บัตรนักศึกษา",
  "6": "กระเป๋า",
};

function getItemName(value: SavedReport): string {
  const candidates = [
    value.itemName,
    value.name,
    value.title,
    value.item_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function DetectiveCat() {
  return (
    <svg
      viewBox="0 0 220 180"
      role="img"
      aria-label="แมวนักสืบ Findly"
      className="detective-cat"
    >
      <defs>
        <linearGradient id="catFur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD28B" />
          <stop offset="100%" stopColor="#F5A65D" />
        </linearGradient>

        <linearGradient id="magnifier" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BDA7FF" />
          <stop offset="100%" stopColor="#8D72D5" />
        </linearGradient>
      </defs>

      {/* หางแมว */}
      <path
        className="cat-tail"
        d="M151 120 C194 126 188 83 164 91"
        fill="none"
        stroke="#F5A65D"
        strokeWidth="15"
        strokeLinecap="round"
      />

      {/* ลำตัว */}
      <ellipse cx="112" cy="123" rx="49" ry="38" fill="url(#catFur)" />

      {/* ขาหลัง */}
      <ellipse cx="83" cy="151" rx="18" ry="10" fill="#FFDDAA" />
      <ellipse cx="129" cy="151" rx="18" ry="10" fill="#FFDDAA" />

      {/* กลุ่มหู ขยับได้ */}
      <g className="cat-ears">
        <path
          d="M66 62 L69 22 L96 49 Z"
          fill="url(#catFur)"
          stroke="#E89A51"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path
          d="M123 49 L150 22 L153 65 Z"
          fill="url(#catFur)"
          stroke="#E89A51"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path d="M74 49 L74 34 L86 48 Z" fill="#F29DAD" />
        <path d="M134 48 L146 34 L146 51 Z" fill="#F29DAD" />
      </g>

      {/* หัว */}
      <g className="cat-head">
        <ellipse
          cx="110"
          cy="72"
          rx="47"
          ry="43"
          fill="url(#catFur)"
          stroke="#E89A51"
          strokeWidth="2"
        />

        {/* ลายหน้าผาก */}
        <path
          d="M101 37 L110 51 L119 37"
          fill="none"
          stroke="#D98842"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ตาปกติ */}
        <g className="cat-eyes">
          <ellipse cx="94" cy="69" rx="4" ry="6" fill="#49376F" />
          <ellipse cx="126" cy="69" rx="4" ry="6" fill="#49376F" />
          <circle cx="95" cy="67" r="1.5" fill="white" />
          <circle cx="127" cy="67" r="1.5" fill="white" />
        </g>


        {/* แก้ม */}
        <ellipse
          cx="82"
          cy="81"
          rx="7"
          ry="4"
          fill="#F08FA8"
          opacity="0.55"
        />
        <ellipse
          cx="138"
          cy="81"
          rx="7"
          ry="4"
          fill="#F08FA8"
          opacity="0.55"
        />

        {/* จมูก */}
        <path
          d="M106 80 Q110 76 114 80 L110 84 Z"
          fill="#E982A3"
        />

        {/* ปาก */}
        <path
          d="M110 84 Q104 92 98 86 M110 84 Q116 92 122 86"
          fill="none"
          stroke="#8C5A48"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* หนวด */}
        <path
          d="M86 82 L66 78 M87 88 L68 91 M134 82 L154 78 M133 88 L152 91"
          fill="none"
          stroke="#A66D50"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>

      {/* ผ้าพันคอ */}
      <path
        d="M76 104 Q110 120 144 104 L139 119 Q110 133 81 119 Z"
        fill="#A995E8"
      />
      <path d="M128 119 L144 139 L122 131 Z" fill="#8D72D5" />

      {/* แว่นขยาย */}
      <g className="magnifier">
        <circle
          cx="151"
          cy="94"
          r="20"
          fill="#FFFFFF"
          fillOpacity="0.7"
          stroke="url(#magnifier)"
          strokeWidth="6"
        />

        <path
          d="M165 109 L183 128"
          stroke="#8D72D5"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M141 85 Q149 77 157 85"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle cx="145" cy="91" r="3" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* ประกายดาว */}
      <path
        className="cat-sparkle sparkle-left"
        d="M39 48 L42 56 L50 59 L42 62 L39 70 L36 62 L28 59 L36 56 Z"
        fill="#F0C76E"
      />

      <path
        className="cat-sparkle sparkle-right"
        d="M178 49 L180 55 L186 57 L180 59 L178 65 L176 59 L170 57 L176 55 Z"
        fill="#B8A2F4"
      />

      {/* อุ้งเท้าหน้า */}
      <ellipse
        className="cat-paw"
        cx="105"
        cy="143"
        rx="13"
        ry="9"
        fill="#FFDDAA"
      />
    </svg>
  );
}

export default function CluePage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id;
  const itemId = Array.isArray(rawId)
    ? rawId[0]
    : typeof rawId === "string"
      ? rawId
      : "";

  const [itemName, setItemName] = useState("สิ่งของที่กำลังตามหา");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    try {
      const storedReports = localStorage.getItem("findly_reports");

      if (storedReports) {
        const parsed: unknown = JSON.parse(storedReports);

        if (Array.isArray(parsed)) {
          const matchingReport = (parsed as SavedReport[]).find((report) => {
            const reportId = String(report.id ?? "");
            const reportItemId = String(report.itemId ?? "");

            return reportId === itemId || reportItemId === itemId;
          });

          if (matchingReport) {
            const name = getItemName(matchingReport);

            if (name) {
              setItemName(name);
            } else if (SAMPLE_ITEMS[itemId]) {
              setItemName(SAMPLE_ITEMS[itemId]);
            }
          } else if (SAMPLE_ITEMS[itemId]) {
            setItemName(SAMPLE_ITEMS[itemId]);
          }
        } else if (SAMPLE_ITEMS[itemId]) {
          setItemName(SAMPLE_ITEMS[itemId]);
        }
      } else if (SAMPLE_ITEMS[itemId]) {
        setItemName(SAMPLE_ITEMS[itemId]);
      }
    } catch (err) {
      console.error("ไม่สามารถอ่านข้อมูลรายการได้:", err);

      if (SAMPLE_ITEMS[itemId]) {
        setItemName(SAMPLE_ITEMS[itemId]);
      }
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!details.trim() || !location.trim() || !contact.trim()) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    setSaving(true);

    try {
      const newClue: Clue = {
  id: `clue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  itemId: itemId || "general",
  itemName: itemId ? itemName : "เบาะแสทั่วไป",
  details: details.trim(),
  location: location.trim(),
  date,
  contact: contact.trim(),
  createdAt: new Date().toISOString(),
};

      const storedClues = localStorage.getItem("findly_clues");
      let existingClues: Clue[] = [];

      if (storedClues) {
        const parsed: unknown = JSON.parse(storedClues);

        if (Array.isArray(parsed)) {
          existingClues = parsed as Clue[];
        }
      }

      localStorage.setItem(
        "findly_clues",
        JSON.stringify([newClue, ...existingClues])
      );

      if (itemId) {
 if (itemId) {
  router.push(`/items/${encodeURIComponent(itemId)}?clueSubmitted=1`);
} else {
  router.push("/items?clueSubmitted=1");
}
} else {
  router.push("/?clueSubmitted=1");
}
    } catch (err) {
      console.error("ไม่สามารถบันทึกเบาะแสได้:", err);
      setError(
        "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้งและตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์"
      );
      setSaving(false);
    }
  }

  return (
    <main className="clue-page">
      {/* พื้นหลังตกแต่ง */}
      <div className="background-decoration" aria-hidden="true">
        <span className="blob blob-one" />
        <span className="blob blob-two" />
        <span className="blob blob-three" />
        <span className="floating-star star-one">✦</span>
        <span className="floating-star star-two">✧</span>
        <span className="floating-star star-three">✦</span>
        <span className="floating-star star-four">✧</span>
        <span className="floating-dot dot-one" />
        <span className="floating-dot dot-two" />
        <span className="floating-dot dot-three" />
      </div>

      {/* Navigation */}
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Findly หน้าแรก">
          <span className="brand-icon">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="34"
                height="34"
                rx="12"
                fill="#49376F"
              />
              <circle
                cx="17"
                cy="17"
                r="7"
                stroke="white"
                strokeWidth="3"
              />
              <path
                d="M22 22 L29 29"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M11 29 L15 25"
                stroke="#D7C8FF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span className="brand-name">
            findly<span>.</span>
          </span>
        </Link>

        <Link href={`/items/${encodeURIComponent(itemId)}`} className="back-link">
          <span aria-hidden="true">←</span>
          <span>กลับไปหน้ารายละเอียด</span>
        </Link>
      </header>

      {/* Main content */}
      <section className="main-container">
        <div className="breadcrumb">
          <Link href="/">หน้าแรก</Link>
          <span>/</span>
          <Link href="/items">รายการสิ่งของ</Link>
          <span>/</span>
          <span className="breadcrumb-current">แจ้งเบาะแส</span>
        </div>

        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-icon">✦</span>
              FINDLY COMMUNITY
            </div>

            <h1>
              เบาะแสเล็ก ๆ
              <br />
              <span>อาจมีความหมายมาก</span>
            </h1>

            <p className="hero-description">
              พบเห็นสิ่งของชิ้นนี้หรือมีข้อมูลเพิ่มเติมไหม?
              <br className="desktop-break" />
              ช่วยแบ่งปันเบาะแส เพื่อให้เจ้าของได้พบกับสิ่งของของเขาอีกครั้ง
            </p>

            <div className="hero-points">
              <div className="hero-point">
                <span className="point-check">✓</span>
                <span>แบ่งปันข้อมูลได้ง่าย</span>
              </div>

              <div className="hero-point">
                <span className="point-check">✓</span>
                <span>ช่วยให้ค้นหาได้เร็วขึ้น</span>
              </div>
            </div>
          </div>

          <div className="hero-illustration">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />

            <div className="illustration-card card-back">
              <span>FIND</span>
              <div className="mini-lines">
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="illustration-card card-front">
              <div className="mini-card-icon">⌕</div>
              <div className="mini-card-lines">
                <i />
                <i />
              </div>
              <span className="mini-badge">FOUND?</span>
            </div>

            <DetectiveCat />

            <div className="bubble bubble-top">
              <span>✦</span> มีเบาะแส!
            </div>

            <div className="bubble bubble-bottom">
              Let&apos;s find it!
            </div>
          </div>
        </div>

        {/* Item information */}
        <div className="item-banner">
          <div className="item-banner-icon">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="5"
                width="38"
                height="38"
                rx="13"
                fill="#EDE5FF"
              />
              <circle
                cx="21"
                cy="21"
                r="8"
                stroke="#7D62BD"
                strokeWidth="2.5"
              />
              <path
                d="M27 27 L34 34"
                stroke="#7D62BD"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="item-banner-content">
            <span className="item-banner-label">
              กำลังแจ้งเบาะแสเกี่ยวกับ
            </span>
            <strong>{loading ? "กำลังโหลดข้อมูล..." : itemName}</strong>
          </div>

          <div className="item-banner-tag">
            <span className="status-dot" />
            แจ้งเบาะแส
          </div>
        </div>

        {/* Form */}
        <div className="form-layout">
          <section className="form-card">
            <div className="form-card-header">
              <div>
                <div className="section-label">
                  <span className="section-label-dot" />
                  SHARE WHAT YOU KNOW
                </div>

                <h2>รายละเอียดเบาะแส</h2>

                <p className="form-intro">
                  เล่าให้เราฟังสักนิด ยิ่งมีข้อมูลชัดเจน
                  ก็ยิ่งช่วยให้ตามหาสิ่งของได้ง่ายขึ้น
                </p>
              </div>

              <div className="form-header-icon" aria-hidden="true">
                ✎
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="details">
                  คุณพบเห็นอะไรบ้าง?
                  <span className="required">*</span>
                </label>

                <p className="field-hint">
                  เช่น ลักษณะสิ่งของ สี ยี่ห้อ หรือเหตุการณ์ที่พบเห็น
                </p>

                <textarea
                  id="details"
                  name="details"
                  placeholder="เล่ารายละเอียดที่คุณทราบได้เลย..."
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={5}
                  maxLength={1500}
                  required
                />

                <div className="textarea-footer">
                  <span>รายละเอียดเพิ่มเติมช่วยให้ตรวจสอบได้ง่ายขึ้น</span>
                  <span>{details.length}/1500</span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="location">
                  สถานที่ที่พบเห็น
                  <span className="required">*</span>
                </label>

                <p className="field-hint">
                  ระบุบริเวณ อาคาร ชั้น หรือจุดสังเกตที่ใกล้เคียง
                </p>

                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M20 10C20 15 12 22 12 22S4 15 4 10a8 8 0 1 1 16 0Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="เช่น อาคารเรียนรวม ชั้น 2"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    maxLength={250}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="date">
                  วันที่พบเห็น
                  <span className="optional-label">ไม่บังคับ</span>
                </label>

                <p className="field-hint">
                  หากจำวันที่ไม่ได้ สามารถเว้นว่างไว้ได้
                </p>

                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M7 3V7M17 3V7M3 10H21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 14H8.01M12 14H12.01M16 14H16.01M8 17H8.01M12 17H12.01"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="contact">
                  ช่องทางติดต่อกลับ
                  <span className="required">*</span>
                </label>

                <p className="field-hint">
                  สำหรับติดต่อสอบถามรายละเอียดเพิ่มเติม หากจำเป็น
                </p>

                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M4 7L12 13L20 7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="contact"
                    name="contact"
                    type="text"
                    placeholder="เช่น อีเมล หรือช่องทางติดต่อที่สะดวก"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    maxLength={250}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="error-message" role="alert">
                  <span aria-hidden="true">!</span>
                  {error}
                </div>
              )}

              <div className="privacy-notice">
                <div className="privacy-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15" r="1.3" fill="currentColor" />
                  </svg>
                </div>

                <div>
                  <strong>โปรดคำนึงถึงความเป็นส่วนตัว</strong>
                  <p>
                    กรุณาให้ข้อมูลที่จำเป็นต่อการตามหาสิ่งของ
                    และหลีกเลี่ยงการเปิดเผยข้อมูลส่วนตัวที่ไม่จำเป็น
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <Link
                  href={`/items/${encodeURIComponent(itemId)}`}
                  className="cancel-button"
                >
                  ยกเลิก
                </Link>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={saving || loading}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      ส่งเบาะแส
                      <span className="submit-arrow" aria-hidden="true">
                        →
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Sidebar */}
          <aside className="side-column">
            <div className="tip-card">
              <div className="tip-icon">💡</div>

              <span className="tip-eyebrow">QUICK TIPS</span>

              <h3>แจ้งเบาะแสอย่างไรให้เป็นประโยชน์?</h3>

              <div className="tip-list">
                <div className="tip-item">
                  <span className="tip-number">01</span>
                  <div>
                    <strong>ให้รายละเอียดชัดเจน</strong>
                    <p>บอกลักษณะสิ่งของหรือสิ่งที่คุณสังเกตเห็น</p>
                  </div>
                </div>

                <div className="tip-item">
                  <span className="tip-number">02</span>
                  <div>
                    <strong>ระบุสถานที่ให้ใกล้เคียงที่สุด</strong>
                    <p>ช่วยจำกัดบริเวณในการค้นหา</p>
                  </div>
                </div>

                <div className="tip-item">
                  <span className="tip-number">03</span>
                  <div>
                    <strong>ให้ช่องทางติดต่อที่เหมาะสม</strong>
                    <p>เผื่อมีข้อมูลที่ต้องสอบถามเพิ่มเติม</p>
                  </div>
                </div>
              </div>

              <div className="tip-bottom">
                <span aria-hidden="true">♡</span>
                ทุกเบาะแสมีความหมาย
              </div>
            </div>

            <div className="help-card">
              <div className="help-decoration" aria-hidden="true">
                ✦
              </div>

              <div className="help-icon" aria-hidden="true">
                ?
              </div>

              <h3>ไม่แน่ใจว่าควรแจ้งอะไร?</h3>

              <p>
                แจ้งเท่าที่คุณทราบได้เลย
                ไม่จำเป็นต้องมีข้อมูลครบทุกอย่าง
              </p>

              <Link href="/items" className="help-link">
                ดูรายการสิ่งของ
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>
        </div>

        <div className="bottom-message">
          <span className="bottom-heart">♡</span>
          <span>
            ขอบคุณที่เป็นส่วนหนึ่งของชุมชน Findly
            <strong> ช่วยกันตามหา ส่งต่อความหวัง</strong>
          </span>
        </div>

        <footer className="page-footer">
          <Link href="/" className="footer-brand">
            findly<span>.</span>
          </Link>
          <span>Lost something? Let&apos;s find it together.</span>
        </footer>
      </section>

      <style jsx>{`
        .clue-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #fcfaff;
          color: #392b51;
          font-family: inherit;
          isolation: isolate;
        }

        .background-decoration {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: -1;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          opacity: 0.7;
        }

        .blob-one {
          width: 540px;
          height: 540px;
          top: 50px;
          left: -280px;
          background: radial-gradient(
            circle,
            rgba(222, 211, 255, 0.56),
            rgba(222, 211, 255, 0)
          );
          animation: blobFloat 13s ease-in-out infinite alternate;
        }

        .blob-two {
          width: 620px;
          height: 620px;
          top: 400px;
          right: -330px;
          background: radial-gradient(
            circle,
            rgba(255, 221, 234, 0.54),
            rgba(255, 221, 234, 0)
          );
          animation: blobFloat 16s ease-in-out infinite alternate-reverse;
        }

        .blob-three {
          width: 420px;
          height: 420px;
          bottom: -220px;
          left: 30%;
          background: radial-gradient(
            circle,
            rgba(224, 234, 255, 0.62),
            rgba(224, 234, 255, 0)
          );
        }

        .floating-star {
          position: absolute;
          color: #b4a0ed;
          opacity: 0.6;
          animation: twinkle 3.5s ease-in-out infinite;
        }

        .star-one {
          top: 150px;
          left: 8%;
          font-size: 26px;
        }

        .star-two {
          top: 410px;
          left: 4%;
          font-size: 33px;
          animation-delay: 1s;
        }

        .star-three {
          top: 250px;
          right: 8%;
          font-size: 25px;
          animation-delay: 0.7s;
        }

        .star-four {
          top: 760px;
          right: 7%;
          font-size: 30px;
          animation-delay: 1.4s;
        }

        .floating-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d3c4ff;
          animation: dotFloat 5s ease-in-out infinite;
        }

        .dot-one {
          top: 280px;
          left: 17%;
        }

        .dot-two {
          top: 590px;
          right: 15%;
          background: #ffc9db;
          animation-delay: 1.5s;
        }

        .dot-three {
          top: 100px;
          right: 24%;
          width: 6px;
          height: 6px;
          animation-delay: 0.8s;
        }

        .topbar {
          min-height: 78px;
          padding: 0 6.5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(94, 72, 134, 0.08);
          background: rgba(255, 255, 255, 0.76);
          backdrop-filter: blur(18px);
          position: relative;
          z-index: 2;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #392b51;
          text-decoration: none;
          transition: transform 0.25s ease;
        }

        .brand:hover {
          transform: translateY(-2px);
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          display: flex;
        }

        .brand-icon svg {
          width: 100%;
          height: 100%;
        }

        .brand-name {
          font-size: 27px;
          font-weight: 850;
          letter-spacing: -1.2px;
        }

        .brand-name span,
        .footer-brand span {
          color: #9679dc;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #76658e;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .back-link:hover {
          color: #7e63c3;
          transform: translateX(-3px);
        }

        .back-link > span:first-child {
          font-size: 20px;
        }

        .main-container {
          max-width: 1160px;
          width: calc(100% - 48px);
          margin: 0 auto;
          position: relative;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          padding-top: 27px;
          font-size: 12px;
          color: #b1a5c2;
        }

        .breadcrumb a {
          color: #9385a7;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .breadcrumb a:hover {
          color: #8064c4;
        }

        .breadcrumb-current {
          color: #7257b3;
          font-weight: 750;
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 30px;
          padding: 52px 0 36px;
        }

        .hero-copy {
          animation: fadeUp 0.7s ease both;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid #e8dfff;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.76);
          color: #8a70c5;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.7px;
        }

        .eyebrow-icon {
          font-size: 14px;
          color: #d6a4c6;
        }

        .hero h1 {
          margin: 22px 0 17px;
          color: #392b51;
          font-size: clamp(34px, 4.2vw, 48px);
          line-height: 1.25;
          font-weight: 850;
          letter-spacing: -1.8px;
        }

        .hero h1 span {
          color: #9277d5;
        }

        .hero-description {
          margin: 0;
          color: #877b98;
          font-size: 14px;
          line-height: 1.95;
        }

        .hero-points {
          display: flex;
          flex-wrap: wrap;
          gap: 17px;
          margin-top: 24px;
        }

        .hero-point {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #695a80;
          font-size: 12px;
          font-weight: 650;
        }

        .point-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e8e0ff;
          color: #8065c3;
          font-size: 12px;
          font-weight: 850;
        }

        .hero-illustration {
          min-height: 280px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          animation: fadeUp 0.8s ease 0.12s both;
        }

        .illustration-orbit {
          position: absolute;
          width: 245px;
          height: 245px;
          border: 1px dashed rgba(160, 139, 218, 0.36);
          border-radius: 50%;
          animation: orbitSpin 30s linear infinite;
        }

        .orbit-two {
          width: 195px;
          height: 195px;
          border-color: rgba(240, 177, 202, 0.5);
          animation-direction: reverse;
          animation-duration: 24s;
        }

        .detective-cat {
          position: relative;
          z-index: 2;
          width: min(260px, 75%);
          overflow: visible;
          animation: catFloat 4s ease-in-out infinite;
        }

        .magnifier {
          transform-origin: 151px 94px;
          animation: magnifierMove 4s ease-in-out infinite;
        }

        .illustration-card {
          position: absolute;
          width: 92px;
          height: 112px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 15px 35px rgba(83, 58, 130, 0.1);
        }

        .card-back {
          top: 23px;
          left: 4%;
          transform: rotate(-12deg);
          color: #a997dc;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.5px;
          animation: cardFloat 5s ease-in-out infinite;
        }

        .card-front {
          right: 1%;
          bottom: 20px;
          transform: rotate(9deg);
          animation: cardFloat 5.5s ease-in-out infinite reverse;
        }

        .mini-lines {
          margin-top: 18px;
          display: grid;
          gap: 7px;
        }

        .mini-lines i,
        .mini-card-lines i {
          display: block;
          height: 5px;
          border-radius: 5px;
          background: #eee8fa;
        }

        .mini-lines i:nth-child(2) {
          width: 70%;
        }

        .mini-lines i:nth-child(3) {
          width: 85%;
        }

        .mini-card-icon {
          width: 31px;
          height: 31px;
          border-radius: 10px;
          background: #f1eaff;
          color: #9679d6;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 25px;
        }

        .mini-card-lines {
          display: grid;
          gap: 6px;
          margin-top: 9px;
        }

        .mini-card-lines i:first-child {
          width: 100%;
        }

        .mini-card-lines i:last-child {
          width: 65%;
        }

        .mini-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 6px;
          border-radius: 5px;
          background: #fce7f0;
          color: #bd7295;
          font-size: 7px;
          font-weight: 850;
          letter-spacing: 1px;
        }

        .bubble {
          position: absolute;
          z-index: 3;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 8px 24px rgba(83, 58, 130, 0.1);
          color: #725a9f;
          font-size: 11px;
          font-weight: 800;
          animation: bubbleFloat 3.5s ease-in-out infinite;
        }

        .bubble-top {
          top: 31px;
          right: 8%;
        }

        .bubble-top span {
          color: #e9a5c4;
          margin-right: 4px;
        }

        .bubble-bottom {
          bottom: 14px;
          left: 8%;
          color: #9b7fce;
          animation-delay: 1s;
        }

        .item-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 27px;
          padding: 18px 22px;
          border: 1px solid rgba(222, 211, 246, 0.8);
          border-radius: 19px;
          background: linear-gradient(
            110deg,
            rgba(255, 255, 255, 0.95),
            rgba(249, 245, 255, 0.95)
          );
          box-shadow: 0 8px 28px rgba(80, 56, 120, 0.045);
          animation: fadeUp 0.65s ease 0.2s both;
        }

        .item-banner-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
        }

        .item-banner-icon svg {
          width: 100%;
          height: 100%;
        }

        .item-banner-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .item-banner-label {
          color: #9d91af;
          font-size: 11px;
        }

        .item-banner-content strong {
          color: #49376f;
          font-size: 17px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .item-banner-tag {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 30px;
          background: #f0eaff;
          color: #8266bf;
          font-size: 11px;
          font-weight: 750;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9a80dc;
          box-shadow: 0 0 0 4px rgba(154, 128, 220, 0.13);
        }

        .form-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(245px, 0.8fr);
          align-items: start;
          gap: 25px;
        }

        .form-card {
          padding: 34px;
          border: 1px solid rgba(226, 217, 241, 0.8);
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 55px rgba(67, 46, 104, 0.065);
          animation: fadeUp 0.7s ease 0.25s both;
        }

        .form-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 25px;
          margin-bottom: 27px;
          border-bottom: 1px solid #f0ebf6;
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9a83cf;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.5px;
        }

        .section-label-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b29ae8;
        }

        .form-card-header h2 {
          margin: 10px 0 8px;
          color: #392b51;
          font-size: 25px;
          font-weight: 850;
          letter-spacing: -0.6px;
        }

        .form-intro {
          margin: 0;
          color: #978aa7;
          font-size: 12px;
          line-height: 1.8;
        }

        .form-header-icon {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 43px;
          height: 43px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f0eaff, #fceaf2);
          color: #9375d1;
          font-size: 24px;
          transform: rotate(-7deg);
        }

        .form-field {
          margin-bottom: 25px;
        }

        .form-field label {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 7px;
          color: #49376f;
          font-size: 13px;
          font-weight: 800;
        }

        .required {
          color: #e58eaf;
          font-size: 14px;
        }

        .optional-label {
          padding: 4px 7px;
          border-radius: 5px;
          background: #f4f0fa;
          color: #a397b6;
          font-size: 9px;
          font-weight: 650;
        }

        .field-hint {
          margin: 0 0 11px;
          color: #a398b1;
          font-size: 11px;
          line-height: 1.7;
        }

        .form-field textarea,
        .input-with-icon input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e9e2f1;
          border-radius: 12px;
          background: #fdfcff;
          color: #49376f;
          font: inherit;
          font-size: 13px;
          outline: none;
          transition:
            border-color 0.22s ease,
            box-shadow 0.22s ease,
            background 0.22s ease;
        }

        .form-field textarea {
          display: block;
          min-height: 135px;
          padding: 15px 16px;
          line-height: 1.8;
          resize: vertical;
        }

        .form-field textarea::placeholder,
        .input-with-icon input::placeholder {
          color: #c0b6ce;
        }

        .form-field textarea:focus,
        .input-with-icon input:focus {
          border-color: #a68ce1;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(166, 140, 225, 0.12);
        }

        .textarea-footer {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          color: #b0a5be;
          font-size: 10px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          left: 14px;
          display: flex;
          width: 20px;
          height: 20px;
          transform: translateY(-50%);
          color: #a18bd0;
          pointer-events: none;
        }

        .input-icon svg {
          width: 100%;
          height: 100%;
        }

        .input-with-icon input {
          min-height: 49px;
          padding: 12px 14px 12px 44px;
        }

        .privacy-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid #eee6fa;
          border-radius: 13px;
          background: linear-gradient(110deg, #faf7ff, #fff8fb);
        }

        .privacy-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 35px;
          height: 35px;
          border-radius: 11px;
          background: #eee7ff;
          color: #8a70c8;
        }

        .privacy-icon svg {
          width: 20px;
          height: 20px;
        }

        .privacy-notice strong {
          display: block;
          margin-bottom: 5px;
          color: #675281;
          font-size: 11px;
          font-weight: 800;
        }

        .privacy-notice p {
          margin: 0;
          color: #9b8eac;
          font-size: 10px;
          line-height: 1.8;
        }

        .error-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-bottom: 18px;
          padding: 12px 14px;
          border: 1px solid #f4c8d5;
          border-radius: 10px;
          background: #fff4f7;
          color: #a94768;
          font-size: 12px;
          line-height: 1.7;
        }

        .error-message > span {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #f5d8e2;
          font-weight: 850;
        }

        .form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 25px;
        }

        .cancel-button,
        .submit-button {
          min-height: 47px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 22px;
          border-radius: 11px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .cancel-button {
          border: 1px solid #e9e2f1;
          background: white;
          color: #8e809f;
        }

        .cancel-button:hover {
          transform: translateY(-2px);
          background: #faf7ff;
          border-color: #d8caef;
        }

        .submit-button {
          min-width: 145px;
          border: 0;
          background: linear-gradient(115deg, #9277d5, #8063c5);
          color: white;
          box-shadow: 0 8px 20px rgba(128, 99, 197, 0.23);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(128, 99, 197, 0.3);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .submit-arrow {
          display: inline-block;
          font-size: 17px;
          transition: transform 0.2s ease;
        }

        .submit-button:hover .submit-arrow {
          transform: translateX(4px);
        }

        .button-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .side-column {
          display: grid;
          gap: 20px;
          animation: fadeUp 0.75s ease 0.35s both;
        }

        .tip-card {
          padding: 25px 22px 20px;
          border: 1px solid rgba(228, 216, 249, 0.85);
          border-radius: 20px;
          background: linear-gradient(155deg, #f5f0ff, #ffffff 75%);
          box-shadow: 0 12px 35px rgba(80, 56, 120, 0.045);
        }

        .tip-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 43px;
          height: 43px;
          margin-bottom: 16px;
          border-radius: 14px;
          background: #e8ddff;
          font-size: 22px;
        }

        .tip-eyebrow {
          color: #9c82d3;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.5px;
        }

        .tip-card h3 {
          margin: 9px 0 22px;
          color: #49376f;
          font-size: 18px;
          font-weight: 850;
          line-height: 1.55;
        }

        .tip-list {
          display: grid;
          gap: 19px;
        }

        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .tip-number {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.92);
          color: #a38bd6;
          font-size: 10px;
          font-weight: 850;
          box-shadow: 0 3px 10px rgba(90, 62, 130, 0.06);
        }

        .tip-item strong {
          display: block;
          margin: 2px 0 5px;
          color: #695481;
          font-size: 11px;
          line-height: 1.5;
        }

        .tip-item p {
          margin: 0;
          color: #a195b0;
          font-size: 10px;
          line-height: 1.8;
        }

        .tip-bottom {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 23px;
          padding-top: 16px;
          border-top: 1px solid #e9e0f7;
          color: #9277c4;
          font-size: 10px;
          font-weight: 750;
        }

        .tip-bottom span {
          color: #e5a0bd;
          font-size: 19px;
        }

        .help-card {
          position: relative;
          overflow: hidden;
          padding: 23px;
          border: 1px solid #f5dfeb;
          border-radius: 19px;
          background: linear-gradient(145deg, #fff2f7, #fffafd);
        }

        .help-decoration {
          position: absolute;
          top: 12px;
          right: 17px;
          color: #efc0d5;
          font-size: 35px;
          animation: twinkle 3s ease-in-out infinite;
        }

        .help-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 35px;
          height: 35px;
          margin-bottom: 13px;
          border-radius: 12px;
          background: #f9deea;
          color: #bf7d9b;
          font-size: 19px;
          font-weight: 850;
        }

        .help-card h3 {
          margin: 0 0 8px;
          color: #73506a;
          font-size: 14px;
          font-weight: 850;
        }

        .help-card p {
          margin: 0;
          color: #a58a9c;
          font-size: 11px;
          line-height: 1.9;
        }

        .help-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 17px;
          color: #a66f92;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          transition: gap 0.2s ease;
        }

        .help-link:hover {
          gap: 15px;
        }

        .bottom-message {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 9px;
          padding: 35px 0 30px;
          color: #a195b1;
          font-size: 11px;
          text-align: center;
        }

        .bottom-heart {
          color: #e4a1bd;
          font-size: 21px;
        }

        .bottom-message strong {
          color: #8a72bb;
          font-weight: 800;
        }

        .page-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          min-height: 68px;
          border-top: 1px solid rgba(94, 72, 134, 0.09);
          color: #b0a5bd;
          font-size: 10px;
        }

        .footer-brand {
          color: #695580;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: -0.7px;
          text-decoration: none;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blobFloat {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            transform: translate3d(25px, -20px, 0) scale(1.06);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.9) rotate(0);
          }

          50% {
            opacity: 1;
            transform: scale(1.13) rotate(12deg);
          }
        }

        @keyframes dotFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes catFloat {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }

          50% {
            transform: translateY(-9px) rotate(1deg);
          }
        }

        @keyframes magnifierMove {
          0%,
          100% {
            transform: rotate(0deg);
          }

          50% {
            transform: rotate(-8deg);
          }
        }

        @keyframes cardFloat {
          0%,
          100% {
            margin-top: 0;
          }

          50% {
            margin-top: -9px;
          }
        }

        @keyframes bubbleFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr 0.8fr;
            gap: 10px;
          }

          .hero h1 {
            font-size: 36px;
          }

          .hero-illustration {
            min-height: 240px;
          }

          .illustration-orbit {
            width: 210px;
            height: 210px;
          }

          .orbit-two {
            width: 170px;
            height: 170px;
          }

          .form-layout {
            grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
            gap: 18px;
          }

          .form-card {
            padding: 25px;
          }

          .tip-card,
          .help-card {
            padding: 20px 17px;
          }
        }

        @media (max-width: 680px) {
          .topbar {
            min-height: 68px;
            padding: 0 20px;
          }

          .brand-icon {
            width: 35px;
            height: 35px;
          }

          .brand-name {
            font-size: 24px;
          }

          .back-link {
            gap: 5px;
            font-size: 11px;
          }

          .main-container {
            width: calc(100% - 32px);
          }

          .breadcrumb {
            padding-top: 21px;
            gap: 8px;
            font-size: 10px;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 5px;
            padding: 38px 0 20px;
          }

          .hero h1 {
            margin-top: 17px;
            font-size: clamp(32px, 8vw, 42px);
            letter-spacing: -1.3px;
          }

          .hero-description {
            font-size: 12px;
          }

          .desktop-break {
            display: none;
          }

          .hero-points {
            gap: 11px;
            margin-top: 17px;
          }

          .hero-point {
            font-size: 10px;
          }

          .hero-illustration {
            min-height: 230px;
            margin-top: 2px;
          }

          .detective-cat {
            width: 220px;
          }

          .illustration-orbit {
            width: 205px;
            height: 205px;
          }

          .orbit-two {
            width: 165px;
            height: 165px;
          }

          .card-back {
            left: 7%;
          }

          .card-front {
            right: 5%;
          }

          .bubble-top {
            right: 5%;
            top: 18px;
          }

          .bubble-bottom {
            left: 4%;
            bottom: 7px;
          }

          .item-banner {
            gap: 11px;
            padding: 14px;
            margin-bottom: 18px;
            border-radius: 15px;
          }

          .item-banner-icon {
            width: 39px;
            height: 39px;
          }

          .item-banner-label {
            font-size: 10px;
          }

          .item-banner-content strong {
            font-size: 14px;
          }

          .item-banner-tag {
            gap: 6px;
            padding: 7px 9px;
            font-size: 9px;
          }

          .status-dot {
            width: 6px;
            height: 6px;
          }

          .form-layout {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .form-card {
            padding: 22px 18px;
            border-radius: 18px;
          }

          .form-card-header {
            padding-bottom: 20px;
            margin-bottom: 22px;
            gap: 12px;
          }

          .form-card-header h2 {
            font-size: 22px;
          }

          .form-intro {
            font-size: 11px;
          }

          .form-header-icon {
            width: 38px;
            height: 38px;
          }

          .form-field {
            margin-bottom: 22px;
          }

          .form-field label {
            font-size: 12px;
          }

          .field-hint {
            font-size: 10px;
          }

          .form-field textarea {
            min-height: 125px;
          }

          .textarea-footer {
            font-size: 9px;
          }

          .privacy-notice {
            padding: 13px;
          }

          .privacy-notice p {
            font-size: 10px;
          }

          .form-actions {
            display: grid;
            grid-template-columns: 0.8fr 1.2fr;
            gap: 10px;
          }

          .cancel-button,
          .submit-button {
            width: 100%;
            box-sizing: border-box;
            padding: 0 12px;
            font-size: 11px;
          }

          .submit-button {
            min-width: 0;
          }

          .side-column {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .tip-card {
            padding: 22px;
          }

          .tip-card h3 {
            font-size: 17px;
          }

          .tip-item strong {
            font-size: 11px;
          }

          .tip-item p {
            font-size: 10px;
          }

          .help-card {
            padding: 21px;
          }

          .bottom-message {
            padding: 27px 8px;
            font-size: 10px;
            line-height: 1.9;
          }

          .page-footer {
            justify-content: center;
            padding: 15px 0;
            text-align: center;
          }
        }

        @media (max-width: 380px) {
          .topbar {
            padding: 0 14px;
          }

          .back-link {
            font-size: 10px;
          }

          .main-container {
            width: calc(100% - 24px);
          }

          .hero h1 {
            font-size: 31px;
          }

          .item-banner {
            flex-wrap: wrap;
          }

          .item-banner-content {
            width: calc(100% - 55px);
          }

          .item-banner-tag {
            margin-left: 50px;
          }

          .form-card {
            padding: 18px 14px;
          }

          .form-card-header h2 {
            font-size: 20px;
          }

          .form-actions {
            grid-template-columns: 1fr;
          }
        }
                /* 🐱 Detective Cat Animations */

        .detective-cat {
          transform-origin: 110px 90px;
          will-change: transform;
        }

        .detective-cat .cat-head {
          transform-box: view-box;
          transform-origin: 110px 72px;
          animation: catHeadTilt 3.2s ease-in-out infinite;
        }

        .detective-cat .cat-ears {
          transform-box: view-box;
          transform-origin: 110px 55px;
          animation: catEarWiggle 2.6s ease-in-out infinite;
        }

        .detective-cat .cat-tail {
          transform-box: view-box;
          transform-origin: 158px 110px;
          animation: catTailWag 1.8s ease-in-out infinite;
        }

        .detective-cat .cat-blink {
          opacity: 0;
          animation: catBlink 5s ease-in-out infinite;
        }

        .detective-cat .cat-paw {
          transform-box: view-box;
          transform-origin: 105px 143px;
          animation: pawWiggle 1.6s ease-in-out infinite;
        }

        .detective-cat .cat-sparkle {
          transform-box: fill-box;
          transform-origin: center;
          animation: sparklePop 2s ease-in-out infinite;
        }

        .detective-cat .sparkle-right {
          animation-delay: 0.8s;
        }

        .detective-cat .magnifier {
          transform-box: view-box;
          transform-origin: 151px 94px;
          animation: catMagnifierMove 2.8s ease-in-out infinite;
        }

        @keyframes catHeadTilt {
          0%, 100% {
            transform: rotate(0deg);
          }
          35% {
            transform: rotate(-4deg);
          }
          70% {
            transform: rotate(3deg);
          }
        }

        @keyframes catEarWiggle {
          0%, 85%, 100% {
            transform: rotate(0deg);
          }
          90% {
            transform: rotate(-5deg);
          }
          95% {
            transform: rotate(4deg);
          }
        }

        @keyframes catTailWag {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(12deg);
          }
        }

        @keyframes catBlink {
          0%, 43%, 47%, 100% {
            opacity: 0;
          }
          45%, 46% {
            opacity: 1;
          }
        }

        @keyframes catMagnifierMove {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-8deg);
          }
        }

        @keyframes pawWiggle {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          50% {
            transform: rotate(-8deg) translateY(-3px);
          }
        }

        @keyframes sparklePop {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(15deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .clue-page *,
          .clue-page *::before,
          .clue-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}