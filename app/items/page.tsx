"use client";

import LogoutButton from "@/components/LogoutButton";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  findSmartMatches,
  type MatchReport,
} from "../../lib/smart-match";

type ItemType = "lost" | "found";

type Item = {
  id: string | number;
  name: string;
  category: string;
  type: ItemType;
  location: string;
  date: string;
  image: string;
  cardColor: string;
  colorName: string;
};

const categories = [
  "ทั้งหมด",
  "กระเป๋า",
  "อุปกรณ์อิเล็กทรอนิกส์",
  "กุญแจ",
  "บัตรนักศึกษา",
  "อุปกรณ์การเรียน",
  "ยานพาหนะ",
  "สัตว์เลี้ยง",
  "อื่น ๆ",
];

const typeOptions = [
  { label: "ทั้งหมด", value: "ทั้งหมด" },
  { label: "ของหาย", value: "lost" },
  { label: "ของที่พบ", value: "found" },
];

export default function ItemsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [type, setType] = useState("ทั้งหมด");
  const [databaseItems, setDatabaseItems] = useState<Item[]>([]);

  // ตรวจสอบสถานะเข้าสู่ระบบจาก Supabase ก่อนแสดงปุ่มออกจากระบบ
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function checkAuth() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (active) {
          setIsLoggedIn(Boolean(user));
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) {
            setIsLoggedIn(Boolean(session?.user));
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.error("ไม่สามารถตรวจสอบสถานะเข้าสู่ระบบได้:", error);
        if (active) {
          setIsLoggedIn(false);
        }
      }
    }

    void checkAuth();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  // โหลดรายการจาก Supabase เพื่อให้ผู้ใช้เห็นข้อมูลร่วมกัน
useEffect(() => {
  let cancelled = false;

  async function loadDatabaseItems() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("items")
        .select(
          "id, name, category, type, location, date, image, card_color, color_name, description"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ไม่สามารถโหลดรายการจาก Supabase:", error);
        return;
      }

      if (cancelled) return;

      const loadedItems: Item[] = (data ?? [])
        .filter(
          (row) => row.type === "lost" || row.type === "found"
        )
        .map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          type: row.type as ItemType,
          location: row.location,
          date: row.date,
          image: row.image ?? "",
          cardColor: row.card_color ?? "#F3ECFF",
          colorName: row.color_name ?? "",
        }));

      setDatabaseItems(loadedItems);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดรายการ:", error);
    }
  }

  loadDatabaseItems();

  return () => {
    cancelled = true;
  };
}, []);

  // ใช้เฉพาะรายการจริงจาก Supabase ไม่รวมข้อมูลตัวอย่างในโค้ด
  const allItems: Item[] = useMemo(() => databaseItems, [databaseItems]);

  // เตรียมข้อมูลสำหรับระบบ Smart Match
  const matchReports: MatchReport[] = useMemo(
    () =>
      allItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type,
        location: item.location,
        date: item.date,
        color: item.colorName,
      })),
    [allItems]
  );

  function getMatchesForItem(item: Item) {
    if (item.type !== "lost") {
      return [];
    }

    const lostReport: MatchReport = {
      id: item.id,
      name: item.name,
      category: item.category,
      type: item.type,
      location: item.location,
      date: item.date,
      color: item.colorName,
    };

    return findSmartMatches(lostReport, matchReports, 20)
      .filter(
        (match) => String(match.report.id) !== String(item.id)
      )
      .slice(0, 1);
  }

  // ระบบค้นหาและกรองรายการ
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");

    return allItems.filter((item) => {
      const searchableText = [
        item.name,
        item.category,
        item.location,
        item.colorName,
        item.date,
        item.type === "lost"
          ? "ของหาย กำลังตามหา lost"
          : "ของที่พบ มีผู้พบ found",
      ]
        .join(" ")
        .toLocaleLowerCase("th");

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesCategory =
        category === "ทั้งหมด" || item.category === category;

      const matchesType =
        type === "ทั้งหมด" || item.type === type;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [search, category, type, allItems]);

  const clearFilters = () => {
    setSearch("");
    setCategory("ทั้งหมด");
    setType("ทั้งหมด");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "ทั้งหมด" ||
    type !== "ทั้งหมด";

  return (
    <main className="items-page">
      <style jsx>{`
        .items-page {
          --purple: #8063c9;
          --purple-dark: #49376f;
          --purple-soft: #f2edff;
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          overflow: hidden;
          padding: 26px 5% 64px;
          background:
            radial-gradient(
              ellipse at 8% 12%,
              rgba(222, 208, 255, 0.46),
              transparent 30%
            ),
            radial-gradient(
              ellipse at 92% 28%,
              rgba(255, 218, 232, 0.38),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #fdfbff 0%,
              #fffdfb 58%,
              #faf7ff 100%
            );
          color: var(--purple-dark);
        }

        * {
          box-sizing: border-box;
        }

        .background-orb {
          position: absolute;
          z-index: -1;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(1px);
        }

        .orb-one {
          top: 180px;
          left: -100px;
          width: 210px;
          height: 210px;
          background: rgba(220, 205, 255, 0.2);
          animation: drift 12s ease-in-out infinite;
        }

        .orb-two {
          top: 480px;
          right: -110px;
          width: 240px;
          height: 240px;
          background: rgba(255, 216, 232, 0.23);
          animation: drift 15s ease-in-out infinite reverse;
        }

        .orb-three {
          top: 1080px;
          left: 8%;
          width: 100px;
          height: 100px;
          background: rgba(210, 238, 226, 0.2);
          animation: drift 10s ease-in-out infinite;
        }

        .topbar,
        .hero,
        .search-area,
        .listing {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1280px;
          margin-right: auto;
          margin-left: auto;
        }

        /* Navigation */

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
          padding: 4px 0 18px;
          border-bottom: 1px solid rgba(116, 84, 189, 0.1);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--purple-dark);
          text-decoration: none;
        }

        .brand-icon {
          display: grid;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 13px;
          background: linear-gradient(145deg, #8c70d2, #b5a0ee);
          color: white;
          box-shadow: 0 7px 18px rgba(116, 84, 189, 0.17);
          font-size: 23px;
        }

        .brand-name {
          display: flex;
          flex-direction: column;
          font-size: 23px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.8px;
        }

        .brand-caption {
          margin-top: 6px;
          color: #9c8bad;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        .back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 13px;
          border: 1px solid #e9e1f5;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.72);
          color: #8169aa;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition:
            color 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .back:hover {
          border-color: #cbb9ed;
          background: white;
          color: #573b94;
        }

        /* Hero */

        .hero {
          display: grid;
          grid-template-columns:
            minmax(80px, 1fr)
            minmax(0, 2.2fr)
            minmax(80px, 1fr);
          align-items: center;
          gap: 12px;
          min-height: 245px;
          margin-bottom: 20px;
        }

        .hero-copy {
          grid-column: 2;
          grid-row: 1;
          text-align: center;
          animation: riseIn 0.6s ease both;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border: 1px solid rgba(205, 187, 248, 0.8);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          color: #9276cf;
          box-shadow: 0 4px 14px rgba(73, 55, 111, 0.035);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.14);
        }

        .heading {
          margin: 15px 0 10px;
          font-size: clamp(32px, 4vw, 51px);
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -1.8px;
        }

        .heading span {
          display: inline-block;
          color: #a184eb;
        }

        .subtitle {
          max-width: 520px;
          margin: 0 auto;
          color: #8f829f;
          font-size: 13px;
          line-height: 1.9;
        }

        .hero-art {
          position: relative;
          display: flex;
          min-height: 190px;
          align-items: center;
          justify-content: center;
        }

        .hero-art.left {
          grid-column: 1;
          grid-row: 1;
        }

        .hero-art.right {
          grid-column: 3;
          grid-row: 1;
        }

        .art-orbit {
          position: absolute;
          width: 125px;
          height: 125px;
          border: 1px dashed rgba(173, 148, 229, 0.4);
          border-radius: 50%;
          animation: orbitSpin 30s linear infinite;
        }

        .art-orbit::before,
        .art-orbit::after {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c4aff8;
          content: "";
        }

        .art-orbit::before {
          top: 13px;
          left: 24px;
        }

        .art-orbit::after {
          right: 5px;
          bottom: 35px;
          background: #f3b7d0;
        }

        .art-main {
          position: relative;
          display: grid;
          width: 90px;
          height: 90px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 27px;
          background: linear-gradient(145deg, #f2eaff, #e2d3ff);
          box-shadow: 0 12px 28px rgba(121, 91, 184, 0.12);
          font-size: 37px;
          animation: floatSoft 4.5s ease-in-out infinite;
        }

        .hero-art.right .art-main {
          border-radius: 50%;
          background: linear-gradient(145deg, #fff0f5, #f8d9e7);
          animation-delay: -1.5s;
        }

        .mini-art {
          position: absolute;
          display: grid;
          width: 37px;
          height: 37px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          background: white;
          box-shadow: 0 6px 17px rgba(73, 55, 111, 0.08);
          font-size: 18px;
          animation: floatSoft 4s ease-in-out infinite;
        }

        .mini-art.one {
          top: 18px;
          right: 0;
          transform: rotate(9deg);
        }

        .mini-art.two {
          bottom: 15px;
          left: 0;
          animation-delay: -2s;
          transform: rotate(-10deg);
        }

        .hero-art.right .mini-art.one {
          top: 10px;
          right: 0;
          animation-delay: -1s;
        }

        .hero-art.right .mini-art.two {
          bottom: 18px;
          left: 0;
          animation-delay: -3s;
        }

        .sparkle {
          position: absolute;
          color: #c0a7f4;
          font-size: 20px;
          animation: twinkle 2.8s ease-in-out infinite;
        }

        .sparkle.s1 {
          top: 18px;
          left: 5px;
        }

        .sparkle.s2 {
          right: 0;
          bottom: 10px;
          color: #e8a9c5;
          animation-delay: -1.4s;
        }

        /* Search and filters */

        .search-area {
          max-width: 920px;
          margin-bottom: 38px;
          padding: 20px;
          border: 1px solid rgba(231, 222, 246, 0.9);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 12px 34px rgba(73, 55, 111, 0.045);
          backdrop-filter: blur(12px);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 9px 7px 14px;
          border: 1px solid #e8def9;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.96);
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .search-box:focus-within {
          border-color: #b9a0f8;
          box-shadow: 0 0 0 3px rgba(185, 160, 248, 0.13);
        }

        .search-icon {
          display: grid;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 10px;
          background: #f2edff;
          font-size: 18px;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          border: none;
          outline: none;
          background: transparent;
          color: #49376f;
          font: inherit;
          font-size: 13px;
        }

        .search-box input::placeholder {
          color: #b0a4bd;
        }

        .clear-search {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border: none;
          border-radius: 9px;
          background: #f7f3fc;
          color: #8f79bb;
          cursor: pointer;
          font-size: 14px;
        }

        .clear-search:hover {
          background: #eee6fc;
        }

        .search-help {
          margin: 10px 0 21px 4px;
          color: #a093af;
          font-size: 11px;
          line-height: 1.7;
        }

        .filter-title {
          margin: 0 0 11px 3px;
          color: #77668e;
          font-size: 11px;
          font-weight: 800;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter {
          padding: 9px 13px;
          border: 1px solid #e9e0f6;
          border-radius: 8px;
          background: #fff;
          color: #77678d;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease;
        }

        .filter:hover {
          border-color: #cdbcf2;
          background: #faf7ff;
        }

        .filter.active {
          border-color: #8063c9;
          background: #8063c9;
          color: white;
          box-shadow: 0 4px 10px rgba(116, 84, 189, 0.13);
        }

        /* Catalog section */

        .listing {
          max-width: 1280px;
          isolation: isolate;
          padding: 28px 26px 30px;
          border: 1px solid rgba(231, 221, 245, 0.9);
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 48px rgba(87, 61, 128, 0.055);
          backdrop-filter: blur(10px);
        }

        .listing::before,
        .listing::after {
          position: absolute;
          z-index: -1;
          border-radius: 50%;
          content: "";
          filter: blur(35px);
          pointer-events: none;
        }

        .listing::before {
          top: 70px;
          left: -45px;
          width: 170px;
          height: 170px;
          background: rgba(222, 208, 255, 0.2);
        }

        .listing::after {
          right: -35px;
          bottom: 30px;
          width: 190px;
          height: 190px;
          background: rgba(255, 218, 232, 0.23);
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 0 0 20px;
        }

        .section-kicker {
          display: block;
          margin-bottom: 8px;
          color: #a18ac9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .section-heading h2 {
          margin: 0;
          color: #49376f;
          font-size: clamp(23px, 2.4vw, 30px);
          font-weight: 900;
          line-height: 1.3;
          letter-spacing: -0.7px;
        }

        .count {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid #eee5fa;
          border-radius: 8px;
          background: #fff;
          color: #8b78a4;
          font-size: 11px;
          white-space: nowrap;
        }

        .type-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid #f0eaf7;
        }

        .type-filters .filter {
          padding: 9px 14px;
        }

        /* Item cards */

        .grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: stretch;
          gap: 18px;
        }

        .card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
          overflow: hidden;
          border: 1px solid #e9e3ef;
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(76, 53, 112, 0.045);
          animation: riseIn 0.4s ease both;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: #d5c7ee;
          box-shadow: 0 8px 20px rgba(76, 53, 112, 0.085);
        }

        .photo {
          position: relative;
          display: flex;
          height: 210px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 10px;
          background: linear-gradient(145deg, #f7f3fc 0%, #f2eaf8 100%);
          border-bottom: 1px solid rgba(232, 222, 244, 0.8);
        }

        .photo::after {
          position: absolute;
          z-index: 1;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12),
            transparent 35%,
            rgba(85, 65, 125, 0.025)
          );
          content: "";
          pointer-events: none;
        }

      .photo img {
  position: relative;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  padding: 8px;
  mix-blend-mode: normal;
  filter: none;
  transition: transform 0.25s ease;
}

.card:hover .photo img {
  transform: scale(1.02);
}

        .card:hover .photo img {
          transform: scale(1.035);
          filter: drop-shadow(0 10px 12px rgba(64, 45, 91, 0.12));
        }

        .photo-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 16px;
          background: linear-gradient(145deg, #f7f3fc 0%, #f0e7f6 100%);
          color: #8872b4;
          text-align: center;
        }

        .photo-placeholder[hidden] {
          display: none;
        }

        .placeholder-symbol {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border: 1px solid rgba(151, 125, 204, 0.18);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.8);
          color: #8a70c2;
          box-shadow: 0 8px 20px rgba(88, 64, 133, 0.07);
          font-size: 29px;
          line-height: 1;
        }

        .photo-placeholder strong {
          color: #695783;
          font-size: 12px;
          font-weight: 750;
        }

        .photo-placeholder small {
          padding: 0 10px;
          color: #a296b2;
          font-size: 10px;
          line-height: 1.6;
        }

        .badge {
          position: absolute;
          z-index: 2;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 7px;
          box-shadow: 0 2px 6px rgba(50, 35, 75, 0.055);
          backdrop-filter: blur(8px);
          font-size: 10px;
          font-weight: 800;
        }

        .badge.lost {
          border-color: #ffd6d6;
          background: rgba(255, 240, 240, 0.94);
          color: #dc2626;
        }

        .badge.found {
          border-color: #c8efd3;
          background: rgba(234, 249, 239, 0.94);
          color: #16803d;
        }

        /* Card information */

        .card-content {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 15px 15px 14px;
        }

        .category-label {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
          color: #a18bbd;
          font-size: 10px;
          font-weight: 650;
          letter-spacing: 0.15px;
          line-height: 1.6;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-name {
          display: -webkit-box;
          min-height: 48px;
          overflow: hidden;
          margin: 7px 0 13px;
          color: #392a4d;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.5;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #81738f;
          font-size: 11px;
          line-height: 1.5;
        }

        .meta span {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .meta-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meta-mark {
          display: inline-grid;
          width: 27px;
          height: 27px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #f0e8fb;
          border-radius: 9px;
          background: #f7f2ff;
          font-size: 12px;
        }

        /* Smart Match */

        .match-compact {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          margin-top: 12px;
          padding: 9px 10px;
          border: 1px solid #e8e0f3;
          border-radius: 9px;
          background: #faf8fd;
        }

        .match-compact-icon {
          flex-shrink: 0;
          font-size: 12px;
        }

        .match-compact-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          color: #77668e;
          font-size: 10px;
          line-height: 1.5;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .match-compact-text strong {
          color: #6744ad;
          font-weight: 800;
        }

        .match-compact-link {
          flex-shrink: 0;
          color: #7454bd;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .match-compact-link:hover {
          text-decoration: underline;
        }

        /* Card footer and actions */

        .card-bottom {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-top: auto;
          padding-top: 13px;
          border-top: 1px solid #f0ebf4;
        }

        .date {
          overflow: hidden;
          color: #a093af;
          font-size: 10px;
          letter-spacing: 0.1px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-actions {
          display: flex;
          align-items: stretch;
          gap: 8px;
          width: 100%;
        }

        .card-actions .clue-link,
        .card-actions .detail-link {
          display: inline-flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 38px;
          padding: 8px 8px;
          border: 1px solid #e6dfed;
          border-radius: 8px;
          text-align: center;
          text-decoration: none;
          font-family: inherit;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.4;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .card-actions .clue-link {
          border-color: #e4d9f6;
          background: #f6f1ff;
          color: #6849a2;
        }

        .card-actions .clue-link:hover {
          border-color: #bba3f0;
          background: #e7dbff;
        }

        .card-actions .detail-link {
          background: #fff;
          color: #67527f;
        }

        .card-actions .detail-link:hover {
          border-color: #cbb7ed;
          background: #faf6ff;
          color: #573b94;
        }

        /* Empty state */

        .empty {
          grid-column: 1 / -1;
          padding: 54px 20px;
          border: 1px dashed #d9c8f4;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.85);
          color: #8d7ba6;
          text-align: center;
        }

        .empty-emoji {
          margin-bottom: 12px;
          font-size: 36px;
          animation: floatSoft 3s ease-in-out infinite;
        }

        .empty h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .empty p {
          margin: 0 0 16px;
          font-size: 12px;
          line-height: 1.7;
        }

        .reset-button {
          padding: 10px 15px;
          border: 1px solid #8063c9;
          border-radius: 8px;
          background: #8063c9;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          transition: background 0.2s ease;
        }

        .reset-button:hover {
          background: #6e51b5;
        }

        /* Help panel */

        .hint {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 1280px;
          margin: 24px auto 0;
          padding: 18px 20px;
          border: 1px solid rgba(226, 215, 245, 0.85);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.72);
          color: #796397;
          box-shadow: 0 8px 22px rgba(73, 55, 111, 0.035);
          font-size: 11px;
          line-height: 1.9;
        }

        .hint-icon {
          display: grid;
          width: 31px;
          height: 31px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 9px;
          background: #f2edff;
          color: #8063c9;
          font-size: 15px;
        }

        .hint strong {
          display: inline-block;
          margin-bottom: 3px;
          color: #66517f;
        }

        /* Animations */

        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatSoft {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-7px) rotate(2deg);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.85);
          }

          50% {
            opacity: 1;
            transform: scale(1.1);
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

        @keyframes drift {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(14px, -12px);
          }
        }

        /* Tablet */

        @media (max-width: 1100px) {
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .photo {
            height: 205px;
          }

          .hero {
            grid-template-columns: 85px minmax(0, 1fr) 85px;
          }

          .art-orbit {
            width: 105px;
            height: 105px;
          }

          .art-main {
            width: 75px;
            height: 75px;
            border-radius: 23px;
            font-size: 32px;
          }
        }

        /* Mobile */

        @media (max-width: 760px) {
          .items-page {
            padding: 22px 20px 45px;
          }

          .topbar {
            margin-bottom: 20px;
          }

          .brand-name {
            font-size: 21px;
          }

          .back {
            padding: 9px 10px;
            font-size: 11px;
          }

          .hero {
            display: flex;
            min-height: auto;
            flex-direction: column;
            gap: 0;
            margin-bottom: 25px;
          }

          .hero-copy {
            order: 1;
          }

          .hero-art {
            width: 100%;
            min-height: 80px;
          }

          .hero-art.left {
            order: 2;
            margin-top: 15px;
          }

          .hero-art.right {
            display: none;
          }

          .hero-art.left .art-orbit {
            width: 85px;
            height: 85px;
          }

          .hero-art.left .art-main {
            width: 64px;
            height: 64px;
            border-radius: 20px;
            font-size: 27px;
          }

          .hero-art.left .mini-art.one {
            top: 0;
            right: calc(50% - 65px);
          }

          .hero-art.left .mini-art.two {
            bottom: 0;
            left: calc(50% - 65px);
          }

          .hero-art.left .sparkle.s1 {
            left: calc(50% - 80px);
          }

          .hero-art.left .sparkle.s2 {
            right: calc(50% - 80px);
          }

          .heading {
            margin-top: 15px;
            font-size: clamp(32px, 7vw, 43px);
            letter-spacing: -1px;
          }

          .subtitle {
            font-size: 12px;
          }

          .subtitle br {
            display: none;
          }

          .search-area {
            margin-bottom: 28px;
            padding: 15px;
            border-radius: 16px;
          }

          .search-help {
            font-size: 10px;
          }

          .listing {
            padding: 18px 14px 20px;
            border-radius: 20px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .section-heading h2 {
            font-size: 23px;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .photo {
            height: 165px;
          }

          .card-content {
            padding: 12px;
          }

          .item-name {
            min-height: 42px;
            margin: 8px 0 12px;
            font-size: 13px;
          }

          .category-label {
            font-size: 9px;
          }

          .meta {
            gap: 8px;
            font-size: 10px;
          }

          .meta-mark {
            width: 22px;
            height: 22px;
            font-size: 10px;
          }

          .card-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .card-actions .clue-link,
          .card-actions .detail-link {
            width: 100%;
            min-height: 34px;
            padding: 8px 6px;
            font-size: 10px;
          }

          .hint {
            gap: 10px;
            padding: 15px;
            font-size: 10px;
          }
        }

        @media (max-width: 390px) {
          .items-page {
            padding-right: 12px;
            padding-left: 12px;
          }

          .brand-icon {
            width: 36px;
            height: 36px;
          }

          .brand-name {
            font-size: 19px;
          }

          .brand-caption {
            font-size: 7px;
          }

          .grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .photo {
            height: 205px;
          }

          .card-content {
            padding: 14px;
          }

          .item-name {
            min-height: auto;
            font-size: 15px;
          }

          .card-actions {
            flex-direction: row;
          }

          .card-actions .clue-link,
          .card-actions .detail-link {
            width: auto;
            min-height: 38px;
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-one,
          .orb-two,
          .orb-three,
          .art-orbit,
          .art-main,
          .mini-art,
          .sparkle,
          .card,
          .empty-emoji,
          .hero-copy {
            animation: none !important;
          }

          .card,
          .card:hover,
          .photo img {
            transition: none !important;
          }
        }
      `}</style>

      <div className="background-orb orb-one" aria-hidden="true" />
      <div className="background-orb orb-two" aria-hidden="true" />
      <div className="background-orb orb-three" aria-hidden="true" />

      {/* Navigation */}
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Findly กลับหน้าแรก">
          <span className="brand-icon" aria-hidden="true">
            ⌕
          </span>

          <span className="brand-name">
            <span>
              findly<span style={{ color: "#B9A0F8" }}>.</span>
            </span>
            <span className="brand-caption">LOST &amp; FOUND HUB</span>
          </span>
        </Link>

               <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" className="back">
            <span aria-hidden="true">←</span>
            กลับหน้าแรก
          </Link>

          {isLoggedIn && <LogoutButton />}
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-art left" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-main">🎒</div>
          <div className="mini-art one">🔑</div>
          <div className="mini-art two">📱</div>
          <span className="sparkle s1">✦</span>
          <span className="sparkle s2">✧</span>
        </div>

        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            FIND WHAT YOU LOST
          </div>

          <h1 className="heading">
            ตามหาสิ่งของ
            <br />
            <span>ที่หายไปด้วยกัน</span>
          </h1>

          <p className="subtitle">
            ของที่หายอาจอยู่ใกล้กว่าที่คิด
            <br />
            ลองค้นหาด้วยชื่อ สี หมวดหมู่ หรือสถานที่ที่พบเห็น
          </p>
        </div>

        <div className="hero-art right" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-main">🎧</div>
          <div className="mini-art one">✦</div>
          <div className="mini-art two">🧸</div>
          <span className="sparkle s1">✧</span>
          <span className="sparkle s2">✦</span>
        </div>
      </section>

      {/* Search */}
      <section className="search-area" aria-label="ค้นหาสิ่งของ">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            aria-label="ค้นหาชื่อสิ่งของ สี หมวดหมู่ หรือสถานที่"
            placeholder="ลองค้นหา เช่น กระเป๋าสีชมพู หรือห้องสมุด..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="ล้างคำค้นหา"
              title="ล้างคำค้นหา"
            >
              ✕
            </button>
          )}
        </div>

        <p className="search-help">
          ค้นหาได้จากชื่อสิ่งของ สี สถานที่ หมวดหมู่ และประเภทประกาศ
        </p>

        <p className="filter-title">เลือกหมวดหมู่</p>

        <div className="filters" aria-label="ตัวกรองหมวดหมู่สิ่งของ">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={`filter ${category === item ? "active" : ""}`}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Listing */}
      <section className="listing">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              COMMUNITY LOST &amp; FOUND
            </span>
            <h2>สิ่งของที่กำลังตามหา</h2>
          </div>

          <span className="count" aria-live="polite">
            พบ {filteredItems.length} จาก {allItems.length} รายการ
          </span>
        </div>

        <div className="type-filters" aria-label="เลือกประเภทประกาศ">
          {typeOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`filter ${type === option.value ? "active" : ""}`}
              onClick={() => setType(option.value)}
              aria-pressed={type === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const matches =
                item.type === "lost" ? getMatchesForItem(item) : [];

              return (
                <article
                  className="card"
                  key={`${String(item.id)}-${index}`}
                  style={{
                    animationDelay: `${Math.min(index, 8) * 40}ms`,
                  }}
                >
                  <div
                    className="photo"
                    style={{ backgroundColor: item.cardColor }}
                  >
                    {item.image ? (
                      <>
                        <div className="photo-placeholder" hidden>
                          <span
                            className="placeholder-symbol"
                            aria-hidden="true"
                          >
                            ▧
                          </span>
                          <strong>ไม่สามารถแสดงรูปภาพได้</strong>
                          <small>ลองตรวจสอบรายละเอียดประกาศอีกครั้ง</small>
                        </div>

                        <img
                          src={item.image}
                          alt={`ภาพตัวอย่าง${item.name}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";

                            const placeholder =
                              event.currentTarget.parentElement?.querySelector(
                                ".photo-placeholder"
                              );

                            if (placeholder) {
                              placeholder.removeAttribute("hidden");
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className="photo-placeholder">
                        <span
                          className="placeholder-symbol"
                          aria-hidden="true"
                        >
                          📦
                        </span>
                        <strong>รายการนี้ไม่ได้แนบรูปภาพ</strong>
                        <small>
                          ยังไม่มีภาพประกอบสำหรับสิ่งของชิ้นนี้
                        </small>
                      </div>
                    )}

                    <span
                      className={`badge ${
                        item.type === "lost" ? "lost" : "found"
                      }`}
                    >
                      <span aria-hidden="true">●</span>
                      {item.type === "lost" ? "กำลังตามหา" : "พบของ"}
                    </span>
                  </div>

                  <div className="card-content">
                    <div className="category-label">
                      {item.category} · สี
                      {item.colorName.split(" ")[0]}
                    </div>

                    <h3 className="item-name">{item.name}</h3>

                    <div className="meta">
                      <span>
                        <span className="meta-mark" aria-hidden="true">
                          📍
                        </span>
                        <span className="meta-text">{item.location}</span>
                      </span>

                      <span>
                        <span className="meta-mark" aria-hidden="true">
                          📅
                        </span>
                        <span className="meta-text">{item.date}</span>
                      </span>
                    </div>

                    {matches.length > 0 && (
                      <div className="match-compact">
                        <span
                          className="match-compact-icon"
                          aria-hidden="true"
                        >
                          ✨
                        </span>

                        <span className="match-compact-text">
                          อาจตรงกับ{" "}
                          <strong>{matches[0].report.name}</strong>
                        </span>

                        <Link
                          href={`/items/${encodeURIComponent(
                            String(matches[0].report.id)
                          )}`}
                          className="match-compact-link"
                        >
                          ดู
                        </Link>
                      </div>
                    )}

                    <div className="card-bottom">
                      <span className="date">
                        {String(item.id).startsWith("report-")
                          ? "ประกาศจากผู้ใช้"
                          : "ข้อมูลตัวอย่าง"}
                      </span>

                      <div className="card-actions">
                        {item.type === "lost" && (
                          <Link
                            href={`/items/${encodeURIComponent(
                              String(item.id)
                            )}/clue`}
                            className="clue-link"
                            aria-label={`แจ้งเบาะแสเกี่ยวกับ${item.name}`}
                          >
                            ＋ แจ้งเบาะแส
                          </Link>
                        )}

                        <Link
                          href={`/items/${encodeURIComponent(
                            String(item.id)
                          )}`}
                          className="detail-link"
                          aria-label={`ดูรายละเอียด${item.name}`}
                        >
                          ดูรายละเอียด →
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty">
              <div className="empty-emoji" aria-hidden="true">
                🔎
              </div>

              <h3>ยังไม่เจอสิ่งของที่ตามหาเลย</h3>
              <p>ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะ</p>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="reset-button"
                  onClick={clearFilters}
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Help */}
      <aside className="hint">
        <span className="hint-icon" aria-hidden="true">
          ✦
        </span>

        <div>
          <strong>เกร็ดเล็ก ๆ จาก Findly</strong>
          <br />
          รายการที่แสดงมาจากฐานข้อมูลของ Findly
          หากพบสิ่งของที่คล้ายกับของที่หายไป
          ควรตรวจสอบรายละเอียดเพิ่มเติมก่อน
          เพื่อช่วยให้สิ่งของกลับคืนสู่เจ้าของได้อย่างปลอดภัย
        </div>
      </aside>
    </main>
  );
}