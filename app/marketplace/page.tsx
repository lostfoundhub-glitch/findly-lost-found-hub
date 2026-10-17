"use client";

import { useEffect, useMemo, useState } from "react";

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

type ClueReport = {
  id: string;
  itemId: string;
  itemName: string;
  reason: string;
  description: string;
  createdAt: string;
  status: string;
};

const ITEMS_KEY = "findly_marketplace_items";
const CLUES_KEY = "findly_marketplace_clues";

const CATEGORIES = [
  "ทั้งหมด",
  "โทรศัพท์และแท็บเล็ต",
  "คอมพิวเตอร์และอุปกรณ์",
  "กระเป๋า",
  "เครื่องประดับ",
  "อุปกรณ์การเรียน",
  "อื่น ๆ",
];

const DEMO_ITEMS: MarketplaceItem[] = [
  {
    id: "demo-1",
    name: "โทรศัพท์มือถือมือสอง",
    category: "โทรศัพท์และแท็บเล็ต",
    price: 3500,
    condition: "ใช้งานได้ดี",
    description:
      "โทรศัพท์มือสอง สภาพดี มีร่องรอยการใช้งานเล็กน้อย ผู้ขายสามารถให้รายละเอียดเพิ่มเติมได้",
    location: "มหาวิทยาลัยมหาสารคาม",
    seller: "ร้านตัวอย่าง Findly",
    imageUrl: "",
    createdAt: "2026-10-10T09:00:00.000Z",
  },
  {
    id: "demo-2",
    name: "กระเป๋าสะพายมือสอง",
    category: "กระเป๋า",
    price: 250,
    condition: "สภาพดี",
    description:
      "กระเป๋าสะพายใช้แล้ว สภาพดี เหมาะสำหรับใช้เรียนหรือใช้ในชีวิตประจำวัน",
    location: "มหาวิทยาลัยมหาสารคาม",
    seller: "ร้านตัวอย่าง Findly",
    imageUrl: "",
    createdAt: "2026-10-11T09:00:00.000Z",
  },
  {
    id: "demo-3",
    name: "หูฟังไร้สายมือสอง",
    category: "คอมพิวเตอร์และอุปกรณ์",
    price: 450,
    condition: "ใช้งานได้",
    description:
      "หูฟังไร้สายมือสอง พร้อมกล่อง ผู้สนใจสามารถสอบถามรายละเอียดเพิ่มเติมได้",
    location: "มหาวิทยาลัยมหาสารคาม",
    seller: "ร้านตัวอย่าง Findly",
    imageUrl: "",
    createdAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "demo-4",
    name: "เครื่องคิดเลขวิทยาศาสตร์",
    category: "อุปกรณ์การเรียน",
    price: 300,
    condition: "สภาพดี",
    description:
      "เครื่องคิดเลขสำหรับการเรียนและการสอบ ทดลองใช้งานแล้วและใช้งานได้ตามปกติ",
    location: "มหาวิทยาลัยมหาสารคาม",
    seller: "ร้านตัวอย่าง Findly",
    imageUrl: "",
    createdAt: "2026-10-13T09:00:00.000Z",
  },
];

const inputClass =
  "w-full rounded-xl border border-[#E4D9F0] bg-white px-4 py-3 text-sm text-[#493D55] outline-none transition placeholder:text-[#B2A7BA] focus:border-[#B9A0F8] focus:ring-2 focus:ring-[#B9A0F8]/20";

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

function formatPrice(price: number): string {
  return price.toLocaleString("th-TH");
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProductPlaceholder() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center bg-gradient-to-br from-[#F5F0FF] to-[#FFF0F5]">
      <div className="text-center">
        <div className="text-5xl">🛍️</div>
        <p className="mt-2 text-xs text-[#9A8DA7]">สินค้า Findly</p>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [clues, setClues] = useState<ClueReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [sort, setSort] = useState("newest");

  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(
    null
  );
  const [clueItem, setClueItem] = useState<MarketplaceItem | null>(null);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );

  const [form, setForm] = useState({
    name: "",
    category: "โทรศัพท์และแท็บเล็ต",
    price: "",
    condition: "สภาพดี",
    description: "",
    location: "มหาวิทยาลัยมหาสารคาม",
    seller: "",
    imageUrl: "",
  });

  const [clueForm, setClueForm] = useState({
    reason: "สงสัยว่าเป็นสิ่งของที่ทำหาย",
    description: "",
  });

  useEffect(() => {
    const savedItems = readArray<MarketplaceItem>(ITEMS_KEY);
    const savedClues = readArray<ClueReport>(CLUES_KEY);

    // ข้อมูลตัวอย่างจะใช้เมื่อยังไม่มีข้อมูลใน localStorage เท่านั้น
    if (localStorage.getItem(ITEMS_KEY) === null) {
      setItems(DEMO_ITEMS);
    } else {
      setItems(savedItems);
    }

    setClues(savedClues);
    setLoaded(true);
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = items.filter((item) => {
      const searchableText = [
        item.name,
        item.category,
        item.description,
        item.location,
        item.seller,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      const matchesCategory =
        category === "ทั้งหมด" || item.category === category;

      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
  }, [items, search, category, sort]);

  function showNotice(
    message: string,
    type: "success" | "error" = "success"
  ) {
    setNotice(message);
    setNoticeType(type);
  }

  function saveItems(nextItems: MarketplaceItem[]): boolean {
    try {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(nextItems));
      setItems(nextItems);
      return true;
    } catch {
      showNotice("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
      return false;
    }
  }

  function saveClues(nextClues: ClueReport[]): boolean {
    try {
      localStorage.setItem(CLUES_KEY, JSON.stringify(nextClues));
      setClues(nextClues);
      return true;
    } catch {
      showNotice("บันทึกเบาะแสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
      return false;
    }
  }

  function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number(form.price);

    if (!form.name.trim()) {
      showNotice("กรุณากรอกชื่อสินค้า", "error");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showNotice("กรุณาระบุราคาที่ถูกต้อง", "error");
      return;
    }

    if (!form.seller.trim()) {
      showNotice("กรุณากรอกชื่อผู้ขายหรือร้านค้า", "error");
      return;
    }

    if (form.imageUrl.trim()) {
      try {
        const imageURL = new URL(form.imageUrl);

        if (
          imageURL.protocol !== "https:" &&
          imageURL.protocol !== "http:"
        ) {
          showNotice("ลิงก์รูปภาพต้องเป็น URL ที่ถูกต้อง", "error");
          return;
        }
      } catch {
        showNotice("ลิงก์รูปภาพไม่ถูกต้อง", "error");
        return;
      }
    }

    const newItem: MarketplaceItem = {
      id: `item-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      price,
      condition: form.condition,
      description: form.description.trim(),
      location: form.location.trim(),
      seller: form.seller.trim(),
      imageUrl: form.imageUrl.trim(),
      createdAt: new Date().toISOString(),
    };

    if (saveItems([newItem, ...items])) {
      setForm({
        name: "",
        category: "โทรศัพท์และแท็บเล็ต",
        price: "",
        condition: "สภาพดี",
        description: "",
        location: "มหาวิทยาลัยมหาสารคาม",
        seller: "",
        imageUrl: "",
      });

      setShowForm(false);
      setSearch("");
      setCategory("ทั้งหมด");
      showNotice("เพิ่มประกาศสินค้าเรียบร้อยแล้ว");
    }
  }

  function handleReportClue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clueItem) return;

    if (clueForm.description.trim().length < 5) {
      showNotice("กรุณาอธิบายเบาะแสอย่างน้อย 5 ตัวอักษร", "error");
      return;
    }

    const newClue: ClueReport = {
      id: `clue-${Date.now()}`,
      itemId: clueItem.id,
      itemName: clueItem.name,
      reason: clueForm.reason,
      description: clueForm.description.trim(),
      createdAt: new Date().toISOString(),
      status: "รอตรวจสอบ",
    };

    if (saveClues([newClue, ...clues])) {
      setClueItem(null);
      setClueForm({
        reason: "สงสัยว่าเป็นสิ่งของที่ทำหาย",
        description: "",
      });
      showNotice(
        "บันทึกเบาะแสแล้ว ข้อมูลนี้ยังไม่ได้ส่งให้ผู้ดูแลหรือเจ้าของสินค้า"
      );
    }
  }

  function resetDemoItems() {
    const confirmed = window.confirm(
      "ต้องการคืนค่ารายการสินค้าตัวอย่างหรือไม่? รายการที่เพิ่มไว้จะถูกแทนที่"
    );

    if (!confirmed) return;

    if (saveItems(DEMO_ITEMS)) {
      showNotice("คืนค่ารายการสินค้าตัวอย่างแล้ว");
    }
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFAF7] text-[#493D55]">
        กำลังโหลด Marketplace...
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
              FINDLY • MARKETPLACE
            </p>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              ตลาดสินค้ามือสอง 🛍️
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B7D94] sm:text-base">
              แหล่งข้อมูลสินค้ามือสองที่ช่วยให้ค้นหาและตรวจสอบเบาะแสของสิ่งของได้ง่ายขึ้น
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setNotice("");
            }}
            className="rounded-xl bg-[#B9A0F8] px-5 py-3 text-sm font-bold text-[#493D55] transition hover:bg-[#A98CEB]"
          >
            {showForm ? "✕ ปิดแบบฟอร์ม" : "+ ลงประกาศสินค้า"}
          </button>
        </header>

        {/* Notice */}
        {notice && (
          <div
            role="status"
            className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm ${
              noticeType === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
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

        {/* Purpose banner */}
        <section className="mb-8 rounded-3xl border border-[#E8DDFB] bg-gradient-to-r from-[#F1E9FF] to-[#FFF0F5] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">
              🔎
            </div>

            <div>
              <h2 className="font-bold">Marketplace เพื่อช่วยตามหาสิ่งของ</h2>
              <p className="mt-2 text-sm leading-6 text-[#756581]">
                รายการสินค้าสามารถใช้เป็นข้อมูลเบื้องต้นเพื่อเปรียบเทียบกับสิ่งของที่หายได้
                หากพบรายการที่คล้ายกัน คุณสามารถส่งเบาะแสให้ตรวจสอบเพิ่มเติมได้
                ทั้งนี้ความคล้ายกันไม่ได้ยืนยันว่าของชิ้นนั้นเป็นของที่หายไป
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">สินค้าที่แสดง</p>
            <p className="mt-2 text-3xl font-extrabold">
              {items.length.toLocaleString("th-TH")}
            </p>
            <p className="mt-1 text-xs text-[#8B7D94]">รายการ</p>
          </div>

          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">หมวดหมู่สินค้า</p>
            <p className="mt-2 text-3xl font-extrabold">
              {new Set(items.map((item) => item.category)).size.toLocaleString(
                "th-TH"
              )}
            </p>
            <p className="mt-1 text-xs text-[#8B7D94]">หมวดหมู่</p>
          </div>

          <div className="rounded-2xl border border-[#EEE6F5] bg-white p-5">
            <p className="text-sm text-[#8B7D94]">เบาะแสที่บันทึกไว้</p>
            <p className="mt-2 text-3xl font-extrabold">
              {clues.length.toLocaleString("th-TH")}
            </p>
            <p className="mt-1 text-xs text-[#8B7D94]">รายการ</p>
          </div>
        </section>

        {/* Add listing form */}
        {showForm && (
          <section className="mb-8 rounded-3xl border border-[#E8DDFB] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">ลงประกาศสินค้าใหม่</h2>
              <p className="mt-2 text-sm text-[#8B7D94]">
                กรอกข้อมูลสินค้าให้ชัดเจน เพื่อให้ค้นหาและเปรียบเทียบเบาะแสได้ง่ายขึ้น
              </p>
            </div>

            <form onSubmit={handleAddItem} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    ชื่อสินค้า *
                  </span>
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="เช่น โทรศัพท์มือถือ รุ่น..."
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    หมวดหมู่ *
                  </span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className={inputClass}
                  >
                    {CATEGORIES.filter((item) => item !== "ทั้งหมด").map(
                      (item) => (
                        <option key={item}>{item}</option>
                      )
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    ราคา (บาท) *
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                    placeholder="เช่น 1500"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    สภาพสินค้า
                  </span>
                  <select
                    value={form.condition}
                    onChange={(event) =>
                      setForm({ ...form, condition: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option>ใหม่</option>
                    <option>สภาพดีมาก</option>
                    <option>สภาพดี</option>
                    <option>มีร่องรอยการใช้งาน</option>
                    <option>ต้องซ่อมแซม</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    ชื่อผู้ขายหรือร้านค้า *
                  </span>
                  <input
                    required
                    maxLength={100}
                    value={form.seller}
                    onChange={(event) =>
                      setForm({ ...form, seller: event.target.value })
                    }
                    placeholder="ชื่อร้านค้าหรือผู้ขาย"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    สถานที่
                  </span>
                  <input
                    maxLength={150}
                    value={form.location}
                    onChange={(event) =>
                      setForm({ ...form, location: event.target.value })
                    }
                    placeholder="เช่น ภายในมหาวิทยาลัย"
                    className={inputClass}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold">
                    ลิงก์รูปภาพ (ถ้ามี)
                  </span>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm({ ...form, imageUrl: event.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className={inputClass}
                  />
                  <span className="mt-2 block text-xs text-[#8B7D94]">
                    เวอร์ชันนี้รับลิงก์รูปภาพจาก URL เท่านั้น ยังไม่มีระบบอัปโหลดไฟล์
                  </span>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold">
                    รายละเอียดสินค้า
                  </span>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="อธิบายรุ่น สี สภาพ หรือรายละเอียดที่ช่วยระบุสินค้า"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="rounded-xl bg-[#B9A0F8] px-6 py-3 text-sm font-bold transition hover:bg-[#A98CEB]"
                >
                  บันทึกประกาศ
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#E4D9F0] px-6 py-3 text-sm font-semibold transition hover:bg-[#FAF7FF]"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search and filters */}
        <section className="mb-6 rounded-3xl border border-[#EEE6F5] bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="md:col-span-1">
              <span className="mb-2 block text-sm font-semibold">
                ค้นหาสินค้า
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ชื่อสินค้า รายละเอียด หรือผู้ขาย..."
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                หมวดหมู่
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                เรียงตาม
              </span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className={inputClass}
              >
                <option value="newest">เพิ่มล่าสุด</option>
                <option value="price-low">ราคาต่ำไปสูง</option>
                <option value="price-high">ราคาสูงไปต่ำ</option>
              </select>
            </label>
          </div>

          <p className="mt-4 text-xs text-[#8B7D94]">
            พบ {filteredItems.length.toLocaleString("th-TH")} รายการ
          </p>
        </section>

        {/* Product grid */}
        {filteredItems.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#DCCFF0] bg-white p-10 text-center">
            <p className="text-5xl">🔎</p>
            <h2 className="mt-4 text-lg font-bold">ไม่พบสินค้าที่ค้นหา</h2>
            <p className="mt-2 text-sm text-[#8B7D94]">
              ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-[#EEE6F5] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-[#F5F0FF] to-[#FFF0F5]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="block h-full w-full object-cover object-center"
                      onError={(event) => {
                        const image = event.currentTarget;
                        image.style.display = "none";
                        const fallback = image.nextElementSibling;
                        if (fallback instanceof HTMLElement) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="h-full w-full items-center justify-center"
                    style={{ display: item.imageUrl ? "none" : "flex" }}
                  >
                    <ProductPlaceholder />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="rounded-full bg-[#F5F0FF] px-3 py-1 text-xs text-[#7C62B8]">
                      {item.category}
                    </span>
                    <span className="text-xs text-[#8B7D94]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <h2 className="text-base font-bold">{item.name}</h2>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#8B7D94]">
                    {item.description || "ไม่มีรายละเอียดสินค้า"}
                  </p>

                  <div className="mt-4">
                    <p className="text-xl font-extrabold text-[#8B6DD1]">
                      ฿{formatPrice(item.price)}
                    </p>
                    <p className="mt-1 text-xs text-[#8B7D94]">
                      สภาพ: {item.condition}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#F0EAF5] pt-3">
                    <p className="text-xs text-[#8B7D94]">
                      📍 {item.location || "ไม่ระบุสถานที่"}
                    </p>
                    <p className="mt-1 text-xs text-[#8B7D94]">
                      🏪 {item.seller}
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="rounded-xl border border-[#DCCFF0] px-3 py-3 text-xs font-semibold transition hover:bg-[#F5F0FF]"
                    >
                      ดูรายละเอียด
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setClueItem(item);
                        setClueForm({
                          reason: "สงสัยว่าเป็นสิ่งของที่ทำหาย",
                          description: "",
                        });
                      }}
                      className="rounded-xl bg-[#B9A0F8] px-3 py-3 text-xs font-semibold transition hover:bg-[#A98CEB]"
                    >
                      แจ้งเบาะแส
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Clue history */}
        <section className="mt-10 rounded-3xl border border-[#EEE6F5] bg-white p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold">📌 เบาะแสที่บันทึกไว้</h2>
            <p className="mt-2 text-sm text-[#8B7D94]">
              รายการที่คุณแจ้งจากหน้า Marketplace ในเบราว์เซอร์นี้
            </p>
          </div>

          {clues.length === 0 ? (
            <div className="rounded-2xl bg-[#FAF7FF] p-6 text-center">
              <p className="text-3xl">🗂️</p>
              <p className="mt-2 font-semibold">ยังไม่มีเบาะแส</p>
              <p className="mt-1 text-sm text-[#8B7D94]">
                กด “แจ้งเบาะแส” บนรายการสินค้าเพื่อบันทึกเบาะแส
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clues.map((clue) => (
                <article
                  key={clue.id}
                  className="rounded-2xl border border-[#EEE6F5] bg-[#FFFCFF] p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h3 className="font-bold">{clue.itemName}</h3>
                      <p className="mt-1 text-sm text-[#8B7D94]">
                        {clue.reason}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {clue.description}
                      </p>
                      <p className="mt-2 text-xs text-[#A79BAF]">
                        {formatDate(clue.createdAt)}
                      </p>
                    </div>

                    <span className="h-fit shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {clue.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Reset demo */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={resetDemoItems}
            className="rounded-xl border border-[#E4D9F0] px-4 py-2 text-xs font-semibold text-[#8B7D94] transition hover:bg-[#F5F0FF]"
          >
            คืนค่ารายการตัวอย่าง
          </button>
        </div>

        {/* Product detail modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#30253B]/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedItem(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-detail-title"
              className="my-8 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#F0EAF5] p-5">
                <h2 id="product-detail-title" className="text-lg font-bold">
                  รายละเอียดสินค้า
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  aria-label="ปิดรายละเอียด"
                  className="rounded-full px-3 py-2 hover:bg-[#F5F0FF]"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                <div className="mb-5 h-48 overflow-hidden rounded-2xl">
                  {selectedItem.imageUrl ? (
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ProductPlaceholder />
                  )}
                </div>

                <span className="rounded-full bg-[#F5F0FF] px-3 py-1 text-xs text-[#7C62B8]">
                  {selectedItem.category}
                </span>

                <h3 className="mt-4 text-xl font-extrabold">
                  {selectedItem.name}
                </h3>

                <p className="mt-2 text-2xl font-extrabold text-[#8B6DD1]">
                  ฿{formatPrice(selectedItem.price)}
                </p>

                <div className="mt-5 space-y-3 text-sm">
                  <p>
                    <span className="font-semibold">สภาพสินค้า:</span>{" "}
                    {selectedItem.condition}
                  </p>
                  <p>
                    <span className="font-semibold">ผู้ขาย:</span>{" "}
                    {selectedItem.seller}
                  </p>
                  <p>
                    <span className="font-semibold">สถานที่:</span>{" "}
                    {selectedItem.location || "ไม่ระบุ"}
                  </p>
                  <p>
                    <span className="font-semibold">วันที่ลงประกาศ:</span>{" "}
                    {formatDate(selectedItem.createdAt)}
                  </p>
                  <div>
                    <p className="font-semibold">รายละเอียด</p>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-[#8B7D94]">
                      {selectedItem.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClueItem(selectedItem);
                    setSelectedItem(null);
                    setClueForm({
                      reason: "สงสัยว่าเป็นสิ่งของที่ทำหาย",
                      description: "",
                    });
                  }}
                  className="mt-6 w-full rounded-xl bg-[#B9A0F8] px-4 py-3 text-sm font-bold transition hover:bg-[#A98CEB]"
                >
                  🚩 แจ้งเบาะแสเกี่ยวกับสินค้านี้
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Clue form modal */}
        {clueItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#30253B]/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setClueItem(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="clue-form-title"
              className="my-8 w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="clue-form-title" className="text-xl font-bold">
                    แจ้งเบาะแสสินค้า
                  </h2>
                  <p className="mt-2 text-sm text-[#8B7D94]">
                    สินค้า: {clueItem.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setClueItem(null)}
                  aria-label="ปิดแบบฟอร์ม"
                  className="rounded-full px-3 py-2 hover:bg-[#F5F0FF]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReportClue} className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    เหตุผลที่แจ้ง *
                  </span>
                  <select
                    value={clueForm.reason}
                    onChange={(event) =>
                      setClueForm({
                        ...clueForm,
                        reason: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option>สงสัยว่าเป็นสิ่งของที่ทำหาย</option>
                    <option>รายละเอียดสินค้าใกล้เคียงกับของที่หาย</option>
                    <option>ต้องการให้ตรวจสอบข้อมูลเพิ่มเติม</option>
                    <option>เหตุผลอื่น ๆ</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    รายละเอียดเบาะแส *
                  </span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={4}
                    value={clueForm.description}
                    onChange={(event) =>
                      setClueForm({
                        ...clueForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="อธิบายว่าสินค้านี้คล้ายกับสิ่งของที่คุณกำลังตามหาอย่างไร"
                    className={inputClass}
                  />
                </label>

                <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  การแจ้งเบาะแสไม่ได้ยืนยันว่ามีการกระทำผิด
                  กรุณาให้ข้อมูลตามข้อเท็จจริงและหลีกเลี่ยงการเผยแพร่ข้อมูลส่วนบุคคล
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#B9A0F8] px-4 py-3 text-sm font-bold transition hover:bg-[#A98CEB]"
                  >
                    บันทึกเบาะแส
                  </button>

                  <button
                    type="button"
                    onClick={() => setClueItem(null)}
                    className="rounded-xl border border-[#E4D9F0] px-4 py-3 text-sm font-semibold hover:bg-[#FAF7FF]"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 rounded-2xl border border-[#E8DDFB] bg-[#F5F0FF] p-5">
          <h2 className="font-bold">💡 หมายเหตุ</h2>
          <p className="mt-2 text-sm leading-6 text-[#756581]">
            Marketplace นี้เป็นเวอร์ชันทดลอง ข้อมูลถูกเก็บไว้ในเบราว์เซอร์ปัจจุบันเท่านั้น
            ยังไม่มีระบบบัญชีผู้ขาย การยืนยันตัวตน การซื้อขายจริง หรือการส่งเบาะแสให้ผู้ดูแล
            ในขั้นตอนถัดไปเราจะเชื่อมข้อมูลกับฐานข้อมูลและฟีเจอร์ Lost Item Clue Matching
          </p>
        </footer>
      </div>
    </main>
  );
}