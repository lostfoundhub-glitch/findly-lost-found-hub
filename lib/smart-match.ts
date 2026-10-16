export type MatchReport = {
  id: string | number;
  type: "lost" | "found";
  name: string;
  category?: string;
  color?: string;
  brand?: string;
  description?: string;
  location?: string;
  date?: string;
};

export type MatchCriterionKey =
  | "category"
  | "name"
  | "color"
  | "brand"
  | "location"
  | "date";

export type MatchCriterion = {
  key: MatchCriterionKey;
  label: string;
  weight: number;
  percentage: number | null;
  points: number;
  maxPoints: number;
  detail: string;
};

export type SmartMatchResult = {
  report: MatchReport;
  score: number;
  reasons: string[];
  criteria: MatchCriterion[];
};

function normalize(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isUnknown(value?: string): boolean {
  const normalized = normalize(value);

  return (
    !normalized ||
    [
      "ไม่ระบุ",
      "ไม่ระบุสี",
      "ไม่ทราบ",
      "ไม่มีข้อมูล",
      "ไม่ระบุสถานที่",
      "ไม่ระบุวันที่",
      "-",
      "n/a",
      "na",
      "unknown",
    ].includes(normalized)
  );
}

function getTokens(value?: string): string[] {
  return normalize(value)
    .split(/[\s,./\\|()[\]{}_-]+/)
    .filter((word) => word.length > 0);
}

function calculateTextSimilarity(
  first?: string,
  second?: string
): number | null {
  if (isUnknown(first) || isUnknown(second)) {
    return null;
  }

  const a = normalize(first);
  const b = normalize(second);

  if (a === b) return 1;

  if (a.includes(b) || b.includes(a)) {
    return 0.8;
  }

  const tokensA = new Set(getTokens(a));
  const tokensB = new Set(getTokens(b));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  const intersection = [...tokensA].filter((word) =>
    tokensB.has(word)
  ).length;

  const union = new Set([...tokensA, ...tokensB]).size;

  return union > 0 ? intersection / union : 0;
}

function createValidDate(
  year: number,
  month: number,
  day: number
): Date | null {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseDate(value?: string): Date | null {
  if (isUnknown(value)) return null;

  const input = value!.trim();

  const isoMatch = input.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (isoMatch) {
    let year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    if (year >= 2400) year -= 543;

    return createValidDate(year, month, day);
  }

  const thaiMonths: Record<string, number> = {
    "ม.ค.": 1,
    "มกราคม": 1,
    "ก.พ.": 2,
    "กุมภาพันธ์": 2,
    "มี.ค.": 3,
    "มีนาคม": 3,
    "เม.ย.": 4,
    "เมษายน": 4,
    "พ.ค.": 5,
    "พฤษภาคม": 5,
    "มิ.ย.": 6,
    "มิถุนายน": 6,
    "ก.ค.": 7,
    "กรกฎาคม": 7,
    "ส.ค.": 8,
    "สิงหาคม": 8,
    "ก.ย.": 9,
    "กันยายน": 9,
    "ต.ค.": 10,
    "ตุลาคม": 10,
    "พ.ย.": 11,
    "พฤศจิกายน": 11,
    "ธ.ค.": 12,
    "ธันวาคม": 12,
  };

  const thaiMatch = input.match(
    /^(\d{1,2})\s+([ก-๙.]+)\s+(\d{4})$/
  );

  if (thaiMatch) {
    const day = Number(thaiMatch[1]);
    const month = thaiMonths[thaiMatch[2]];
    let year = Number(thaiMatch[3]);

    if (month === undefined) return null;

    if (year >= 2400) year -= 543;

    return createValidDate(year, month, day);
  }

  const fallback = new Date(input);

  return Number.isNaN(fallback.getTime())
    ? null
    : fallback;
}

function calculateDateSimilarity(
  first?: string,
  second?: string
): number | null {
  const dateA = parseDate(first);
  const dateB = parseDate(second);

  if (!dateA || !dateB) return null;

  const timeA = Date.UTC(
    dateA.getFullYear(),
    dateA.getMonth(),
    dateA.getDate()
  );

  const timeB = Date.UTC(
    dateB.getFullYear(),
    dateB.getMonth(),
    dateB.getDate()
  );

  const daysApart = Math.abs(timeA - timeB) / 86400000;

  if (daysApart <= 1) return 1;
  if (daysApart <= 3) return 0.8;
  if (daysApart <= 7) return 0.6;
  if (daysApart <= 14) return 0.2;

  return 0;
}

function createCriterion(
  key: MatchCriterionKey,
  label: string,
  weight: number,
  similarity: number | null,
  detail: (percentage: number | null) => string
): MatchCriterion {
  const percentage =
    similarity === null
      ? null
      : Math.round(similarity * 100);

  const points =
    similarity === null
      ? 0
      : Math.round(similarity * weight * 100) / 100;

  return {
    key,
    label,
    weight,
    percentage,
    points,
    maxPoints: weight,
    detail: detail(percentage),
  };
}

export function calculateSmartMatch(
  lostItem: MatchReport,
  foundItem: MatchReport
): SmartMatchResult {
  const criteria: MatchCriterion[] = [
    createCriterion(
      "category",
      "ประเภทสิ่งของ",
      25,
      calculateTextSimilarity(
        lostItem.category,
        foundItem.category
      ),
      (p) =>
        p === null
          ? "ไม่มีข้อมูลประเภทให้เปรียบเทียบ"
          : p === 100
            ? "ประเภทสิ่งของตรงกัน"
            : p > 0
              ? "ประเภทสิ่งของมีข้อมูลบางส่วนตรงกัน"
              : "ประเภทสิ่งของแตกต่างกัน"
    ),

    createCriterion(
      "name",
      "ชื่อสิ่งของ",
      25,
      calculateTextSimilarity(
        lostItem.name,
        foundItem.name
      ),
      (p) =>
        p === null
          ? "ไม่มีชื่อสิ่งของให้เปรียบเทียบ"
          : p === 100
            ? "ชื่อสิ่งของตรงกัน"
            : p > 0
              ? "ชื่อสิ่งของมีความคล้ายคลึงกันบางส่วน"
              : "ชื่อสิ่งของแตกต่างกัน"
    ),

    createCriterion(
      "color",
      "สี",
      15,
      calculateTextSimilarity(
        lostItem.color,
        foundItem.color
      ),
      (p) =>
        p === null
          ? "ไม่มีข้อมูลสีให้เปรียบเทียบ"
          : p === 100
            ? "สีที่ระบุตรงกัน"
            : p > 0
              ? "คำอธิบายสีมีบางส่วนตรงกัน"
              : "สีที่ระบุแตกต่างกัน"
    ),

    createCriterion(
      "brand",
      "ยี่ห้อ / แบรนด์",
      15,
      calculateTextSimilarity(
        lostItem.brand,
        foundItem.brand
      ),
      (p) =>
        p === null
          ? "ไม่มีข้อมูลยี่ห้อให้เปรียบเทียบ"
          : p === 100
            ? "ยี่ห้อที่ระบุตรงกัน"
            : p > 0
              ? "ชื่อยี่ห้อมีความคล้ายคลึงกันบางส่วน"
              : "ยี่ห้อที่ระบุแตกต่างกัน"
    ),

    createCriterion(
      "location",
      "สถานที่",
      15,
      calculateTextSimilarity(
        lostItem.location,
        foundItem.location
      ),
      (p) =>
        p === null
          ? "ไม่มีข้อมูลสถานที่ให้เปรียบเทียบ"
          : p === 100
            ? "ชื่อสถานที่ตรงกัน"
            : p > 0
              ? "ชื่อสถานที่มีข้อมูลบางส่วนตรงกัน"
              : "ชื่อสถานที่แตกต่างกัน"
    ),

    createCriterion(
      "date",
      "วันที่",
      5,
      calculateDateSimilarity(
        lostItem.date,
        foundItem.date
      ),
      (p) =>
        p === null
          ? "ไม่มีวันที่ที่อ่านได้ให้เปรียบเทียบ"
          : p === 100
            ? "วันที่ห่างกันไม่เกิน 1 วัน"
            : p === 80
              ? "วันที่ห่างกันไม่เกิน 3 วัน"
              : p === 60
                ? "วันที่ห่างกันไม่เกิน 7 วัน"
                : p === 20
                  ? "วันที่ห่างกันไม่เกิน 14 วัน"
                  : "วันที่ห่างกันมากกว่า 14 วัน"
    ),
  ];

  const score = Math.round(
    criteria.reduce(
      (total, criterion) => total + criterion.points,
      0
    )
  );

  const reasons = criteria.map((criterion) =>
    criterion.percentage === null
      ? `${criterion.label}: ไม่มีข้อมูลให้เปรียบเทียบ`
      : `${criterion.label}: ${criterion.detail}`
  );

  return {
    report: foundItem,
    score: Math.min(100, Math.max(0, score)),
    reasons,
    criteria,
  };
}

export function findSmartMatches(
  lostItem: MatchReport,
  reports: MatchReport[],
  minimumScore = 20
): SmartMatchResult[] {
  if (lostItem.type !== "lost") {
    return [];
  }

  return reports
    .filter(
      (report) =>
        report.type === "found" &&
        String(report.id) !== String(lostItem.id)
    )
    .map((report) =>
      calculateSmartMatch(lostItem, report)
    )
    .filter((result) => result.score >= minimumScore)
    .sort((a, b) => b.score - a.score);
}