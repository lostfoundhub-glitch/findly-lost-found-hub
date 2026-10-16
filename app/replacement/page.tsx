"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LostReport = {
  id: string | number;
  type?: string;
  name?: string;
  itemName?: string;
  title?: string;
  category?: string;
  description?: string;
  color?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  image?: string;
  imageUrl?: string;
  location?: string;
};

type MarketplaceItem = {
  id: string | number;
  name?: string;
  category?: string;
  price?: number | string;
  condition?: string;
  description?: string;
  location?: string;
  seller?: string;
  imageUrl?: string;
  createdAt?: string;
};

type Recommendation = {
  report: LostReport;
  products: MarketplaceItem[];
  daysLost: number;
};

const REPORTS_KEY = "findly_reports";
const MARKETPLACE_KEY = "findly_marketplace_items";
const WAIT_DAYS = 7;

const COLORS = {
  background: "#FFFAF7",
  purple: "#B9A0F8",
  purpleDark: "#8D6CE5",
  text: "#493D55",
  muted: "#8B7D94",
  border: "#EDE5F4",
  white: "#FFFFFF",
  pink: "#FFE9F0",
  green: "#E7F7EC",
};

function readStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getItemName(item: LostReport) {
  return item.name || item.itemName || item.title || "สิ่งของที่หาย";
}

function normalize(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function isLostReport(report: LostReport) {
  const type = normalize(report.type);

  return (
    type.includes("lost") ||
    type.includes("หาย") ||
    type.includes("ของหาย")
  );
}

function isResolved(report: LostReport) {
  const status = normalize(report.status);

  const resolvedStatuses = [
    "returned",
    "resolved",
    "completed",
    "complete",
    "closed",
    "received",
    "ได้รับคืน",
    "คืนแล้ว",
    "พบแล้ว",
    "สำเร็จ",
    "เสร็จสิ้น",
    "ปิดรายการ",
  ];

  return resolvedStatuses.some((value) => status.includes(value));
}

function getDaysLost(report: LostReport): number | null {
  const dateValue = report.date || report.createdAt;

  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();

  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const difference = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return difference >= 0 ? difference : null;
}

function getSimilarity(
  report: LostReport,
  product: MarketplaceItem
): number {
  const reportName = normalize(getItemName(report));
  const productName = normalize(product.name);
  const reportCategory = normalize(report.category);
  const productCategory = normalize(product.category);

  const reportDescription = normalize(
    `${report.description || ""} ${report.color || ""}`
  );

  const productDescription = normalize(product.description);

  let score = 0;

  // ชื่อสินค้าใกล้เคียงกัน
  if (reportName && productName) {
    if (reportName === productName) {
      score += 50;
    } else if (
      reportName.includes(productName) ||
      productName.includes(reportName)
    ) {
      score += 35;
    } else {
      const words = reportName
        .split(/[\s,./_-]+/)
        .filter((word) => word.length >= 2);

      const matchedWords = words.filter((word) =>
        productName.includes(word)
      );

      if (words.length > 0) {
        score += Math.min(
          30,
          (matchedWords.length / words.length) * 30
        );
      }
    }
  }

  // หมวดหมู่ตรงกัน
  if (
    reportCategory &&
    productCategory &&
    (
      reportCategory === productCategory ||
      reportCategory.includes(productCategory) ||
      productCategory.includes(reportCategory)
    )
  ) {
    score += 30;
  }

  // รายละเอียดมีคำที่ตรงกัน
  if (reportDescription && productDescription) {
    const words = reportDescription
      .split(/[\s,./_-]+/)
      .filter((word) => word.length >= 3);

    const uniqueWords = Array.from(new Set(words));

    const matchedWords = uniqueWords.filter((word) =>
      productDescription.includes(word)
    );

    if (uniqueWords.length > 0) {
      score += Math.min(
        20,
        (matchedWords.length / uniqueWords.length) * 20
      );
    }
  }

  return Math.round(Math.min(score, 100));
}

function formatPrice(price?: number | string) {
  if (price === undefined || price === null || price === "") {
    return "ไม่ระบุราคา";
  }

  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return String(price);
  }

  return `${amount.toLocaleString("th-TH")} บาท`;
}

export default function ReplacementPage() {
  const [reports, setReports] = useState<LostReport[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<
    MarketplaceItem[]
  >([]);
  const [selectedReportId, setSelectedReportId] = useState<
    string | number | "all"
  >("all");
  const [selectedProduct, setSelectedProduct] =
    useState<MarketplaceItem | null>(null);

  useEffect(() => {
    setReports(readStorage<LostReport>(REPORTS_KEY));
    setMarketplaceItems(
      readStorage<MarketplaceItem>(MARKETPLACE_KEY)
    );
  }, []);

  const recommendations = useMemo<Recommendation[]>(() => {
    const lostReports = reports.filter((report) => {
      return isLostReport(report) && !isResolved(report);
    });

    return lostReports
      .map((report) => {
        const daysLost = getDaysLost(report);

        if (daysLost === null || daysLost < WAIT_DAYS) {
          return null;
        }

        const products = marketplaceItems
          .map((product) => ({
            product,
            score: getSimilarity(report, product),
          }))
          .filter((result) => result.score >= 20)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map((result) => result.product);

        return {
          report,
          products,
          daysLost,
        };
      })
      .filter(
        (item): item is Recommendation => item !== null
      )
      .sort((a, b) => b.daysLost - a.daysLost);
  }, [reports, marketplaceItems]);

  const visibleRecommendations = recommendations.filter((item) => {
    if (selectedReportId === "all") return true;

    return String(item.report.id) === String(selectedReportId);
  });

  const totalProducts = recommendations.reduce(
    (total, item) => total + item.products.length,
    0
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        color: COLORS.text,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: COLORS.white,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "18px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: COLORS.text,
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            Findly<span style={{ color: COLORS.purpleDark }}>.</span>
          </Link>

          <Link
            href="/marketplace"
            style={{
              textDecoration: "none",
              color: COLORS.purpleDark,
              fontWeight: 700,
              padding: "10px 16px",
              border: `1px solid ${COLORS.purple}`,
              borderRadius: 12,
            }}
          >
            ไปที่ Marketplace →
          </Link>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "36px 20px 60px",
        }}
      >
        {/* Hero */}
        <section
          style={{
            background: `linear-gradient(135deg, ${COLORS.white}, #F3ECFF)`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 24,
            padding: "32px 28px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: COLORS.pink,
              color: COLORS.purpleDark,
              borderRadius: 20,
              padding: "7px 13px",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            SMART REPLACEMENT
          </div>

          <h1
            style={{
              fontSize: "clamp(27px, 4vw, 38px)",
              margin: "0 0 14px",
              lineHeight: 1.3,
            }}
          >
            ยังหาไม่เจอใช่ไหม?
            <br />
            <span style={{ color: COLORS.purpleDark }}>
              เราช่วยแนะนำสินค้าทดแทนให้คุณ
            </span>
          </h1>

          <p
            style={{
              color: COLORS.muted,
              fontSize: 16,
              lineHeight: 1.8,
              maxWidth: 700,
              margin: 0,
            }}
          >
            หากคุณแจ้งของหายมาแล้วอย่างน้อย 7 วัน
            และยังไม่ได้รับคืน Findly
            จะแสดงสินค้าใน Marketplace ที่อาจใช้ทดแทนสิ่งของเดิมได้
            โดยพิจารณาจากชื่อ หมวดหมู่ และรายละเอียดสินค้า
          </p>
        </section>

        {/* Summary cards */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <SummaryCard
            title="รายการของหายที่เข้าเงื่อนไข"
            value={recommendations.length}
            description="หายมาแล้วอย่างน้อย 7 วัน"
          />

          <SummaryCard
            title="สินค้าที่แนะนำ"
            value={totalProducts}
            description="สินค้าใน Marketplace ที่เกี่ยวข้อง"
          />

          <SummaryCard
            title="ระยะเวลารอ"
            value={`${WAIT_DAYS} วัน`}
            description="ก่อนเริ่มแนะนำสินค้าทดแทน"
          />
        </section>

        {/* Filter */}
        {recommendations.length > 0 && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 23 }}>
                สินค้าทดแทนสำหรับคุณ
              </h2>

              <p
                style={{
                  color: COLORS.muted,
                  margin: 0,
                  fontSize: 14,
                }}
              >
                เลือกรายการของหายเพื่อดูสินค้าที่เกี่ยวข้อง
              </p>
            </div>

            <select
              value={String(selectedReportId)}
              onChange={(event) =>
                setSelectedReportId(
                  event.target.value === "all"
                    ? "all"
                    : event.target.value
                )
              }
              style={{
                padding: "12px 14px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                background: COLORS.white,
                color: COLORS.text,
                fontSize: 14,
                maxWidth: "100%",
              }}
            >
              <option value="all">แสดงของหายทั้งหมด</option>

              {recommendations.map((item) => (
                <option
                  key={String(item.report.id)}
                  value={String(item.report.id)}
                >
                  {getItemName(item.report)}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Recommendation list */}
        {visibleRecommendations.length === 0 ? (
          <section
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 22,
              padding: "42px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 46, marginBottom: 14 }}>
              {recommendations.length > 0 ? "🔎" : "🌷"}
            </div>

            <h2 style={{ fontSize: 22, margin: "0 0 12px" }}>
              {recommendations.length > 0
                ? "ไม่พบรายการที่เลือก"
                : "ยังไม่มีรายการที่เข้าเงื่อนไข"}
            </h2>

            <p
              style={{
                color: COLORS.muted,
                maxWidth: 550,
                margin: "0 auto 22px",
                lineHeight: 1.8,
              }}
            >
              {recommendations.length > 0
                ? "ลองเลือกรายการของหายอื่น หรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
                : "ระบบจะแนะนำสินค้าทดแทนเมื่อมีรายการของหายที่แจ้งมาแล้วอย่างน้อย 7 วัน และยังไม่ได้รับคืน หากเพิ่งแจ้งของหาย โปรดกลับมาตรวจสอบอีกครั้ง"}
            </p>

            {recommendations.length > 0 ? (
              <button
                onClick={() => setSelectedReportId("all")}
                style={primaryButton}
              >
                ดูรายการทั้งหมด
              </button>
            ) : (
              <Link href="/marketplace" style={primaryLink}>
                สำรวจ Marketplace →
              </Link>
            )}
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 24,
            }}
          >
            {visibleRecommendations.map((recommendation) => {
              const report = recommendation.report;

              return (
                <section
                  key={String(report.id)}
                  style={{
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 22,
                    padding: 22,
                  }}
                >
                  {/* Lost item */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      paddingBottom: 20,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 16,
                        background: "#F4EEFF",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {report.image || report.imageUrl ? (
                        <img
                          src={report.image || report.imageUrl}
                          alt={getItemName(report)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 32 }}>🔍</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div
                        style={{
                          color: COLORS.purpleDark,
                          fontSize: 12,
                          fontWeight: 800,
                          marginBottom: 6,
                        }}
                      >
                        YOUR LOST ITEM
                      </div>

                      <h3
                        style={{
                          margin: "0 0 7px",
                          fontSize: 20,
                        }}
                      >
                        {getItemName(report)}
                      </h3>

                      <div
                        style={{
                          color: COLORS.muted,
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        หมวดหมู่: {report.category || "ไม่ระบุ"}
                        <br />
                        สถานที่: {report.location || "ไม่ระบุ"}
                      </div>
                    </div>

                    <div
                      style={{
                        background: COLORS.green,
                        borderRadius: 14,
                        padding: "12px 16px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#34764A",
                        }}
                      >
                        {recommendation.daysLost}
                      </div>

                      <div style={{ fontSize: 12, color: "#34764A" }}>
                        วันที่หาย
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div style={{ paddingTop: 20 }}>
                    <h3
                      style={{
                        margin: "0 0 6px",
                        fontSize: 19,
                      }}
                    >
                      🛍️ สินค้าที่อาจใช้ทดแทนได้
                    </h3>

                    <p
                      style={{
                        color: COLORS.muted,
                        fontSize: 13,
                        margin: "0 0 18px",
                        lineHeight: 1.7,
                      }}
                    >
                      สินค้าเหล่านี้เป็นตัวเลือกทดแทนเบื้องต้น
                      ไม่ใช่หลักฐานว่าสินค้านั้นเป็นของที่คุณทำหาย
                    </p>

                    {recommendation.products.length === 0 ? (
                      <div
                        style={{
                          background: "#FCF9FF",
                          border: `1px dashed ${COLORS.border}`,
                          borderRadius: 14,
                          padding: 20,
                          color: COLORS.muted,
                          textAlign: "center",
                          lineHeight: 1.8,
                        }}
                      >
                        ยังไม่พบสินค้าที่ใกล้เคียงใน Marketplace
                        <br />
                        ลองกลับมาตรวจสอบอีกครั้งเมื่อมีสินค้าใหม่
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: 16,
                        }}
                      >
                        {recommendation.products.map((product) => (
                          <article
                            key={String(product.id)}
                            style={{
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 17,
                              overflow: "hidden",
                              display: "flex",
                              flexDirection: "column",
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                height: 155,
                                background: "#F5F0FF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                              }}
                            >
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name || "สินค้า"}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: 42 }}>📦</span>
                              )}
                            </div>

                            <div
                              style={{
                                padding: 15,
                                display: "flex",
                                flexDirection: "column",
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  color: COLORS.muted,
                                  marginBottom: 7,
                                }}
                              >
                                {product.category || "ไม่ระบุหมวดหมู่"}
                              </div>

                              <h4
                                style={{
                                  fontSize: 16,
                                  lineHeight: 1.5,
                                  margin: "0 0 8px",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {product.name || "สินค้าไม่มีชื่อ"}
                              </h4>

                              <div
                                style={{
                                  fontSize: 19,
                                  color: COLORS.purpleDark,
                                  fontWeight: 800,
                                  marginBottom: 8,
                                }}
                              >
                                {formatPrice(product.price)}
                              </div>

                              <div
                                style={{
                                  fontSize: 13,
                                  color: COLORS.muted,
                                  lineHeight: 1.7,
                                  marginBottom: 14,
                                }}
                              >
                                สภาพ: {product.condition || "ไม่ระบุ"}
                                <br />
                                สถานที่: {product.location || "ไม่ระบุ"}
                              </div>

                              <button
                                onClick={() => setSelectedProduct(product)}
                                style={{
                                  ...primaryButton,
                                  width: "100%",
                                  marginTop: "auto",
                                }}
                              >
                                ดูรายละเอียดสินค้า
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            marginTop: 30,
            padding: 18,
            background: "#F4EEFF",
            borderRadius: 16,
            fontSize: 13,
            color: COLORS.muted,
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: COLORS.text }}>หมายเหตุ:</strong>{" "}
          ระบบนี้ใช้ข้อมูลที่บันทึกไว้ในเบราว์เซอร์เพื่อทดลองการทำงาน
          การแนะนำอาศัยความคล้ายคลึงของชื่อ หมวดหมู่ และรายละเอียดสินค้า
          ยังไม่ใช่ AI ที่เรียนรู้ข้อมูลจริง และยังไม่มีระบบซื้อขายหรือชำระเงิน
        </div>
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(45, 32, 58, 0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: COLORS.white,
              borderRadius: 22,
              padding: 24,
              width: "100%",
              maxWidth: 480,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {selectedProduct.imageUrl && (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name || "สินค้า"}
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              />
            )}

            <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>
              {selectedProduct.name || "สินค้าไม่มีชื่อ"}
            </h2>

            <div
              style={{
                color: COLORS.purpleDark,
                fontSize: 23,
                fontWeight: 800,
                marginBottom: 16,
              }}
            >
              {formatPrice(selectedProduct.price)}
            </div>

            <DetailRow
              label="หมวดหมู่"
              value={selectedProduct.category}
            />

            <DetailRow
              label="สภาพสินค้า"
              value={selectedProduct.condition}
            />

            <DetailRow
              label="ผู้ลงประกาศ"
              value={selectedProduct.seller}
            />

            <DetailRow
              label="สถานที่"
              value={selectedProduct.location}
            />

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                รายละเอียด
              </div>

              <p
                style={{
                  color: COLORS.muted,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {selectedProduct.description || "ไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </div>

            <div
              style={{
                background: "#FFF5E9",
                borderRadius: 12,
                padding: 13,
                color: "#8A6336",
                fontSize: 13,
                lineHeight: 1.7,
                marginTop: 16,
                marginBottom: 18,
              }}
            >
              นี่คือสินค้าแนะนำสำหรับใช้ทดแทนสิ่งของที่หาย
              ไม่ใช่การยืนยันว่าเป็นสิ่งของชิ้นเดียวกัน
              กรุณาตรวจสอบข้อมูลและติดต่อผู้ขายด้วยความระมัดระวัง
            </div>

            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                ...primaryButton,
                width: "100%",
              }}
            >
              ปิดรายละเอียด
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: 22,
      }}
    >
      <div
        style={{
          color: COLORS.muted,
          fontSize: 14,
          marginBottom: 12,
          lineHeight: 1.6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: COLORS.purpleDark,
          fontSize: 30,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div style={{ color: COLORS.muted, fontSize: 12 }}>
        {description}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "9px 0",
        borderBottom: `1px solid ${COLORS.border}`,
        fontSize: 14,
      }}
    >
      <span style={{ color: COLORS.muted, minWidth: 100 }}>
        {label}
      </span>

      <span style={{ overflowWrap: "anywhere" }}>
        {value || "ไม่ระบุ"}
      </span>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  background: COLORS.purple,
  color: COLORS.text,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryLink: React.CSSProperties = {
  display: "inline-block",
  background: COLORS.purple,
  color: COLORS.text,
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: 700,
  textDecoration: "none",
};