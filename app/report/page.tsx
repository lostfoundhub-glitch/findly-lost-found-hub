 "use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type ReportType = "lost" | "found";

type SavedReport = {
  id: string;
  type: ReportType;
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
};

const categories = [
  "กระเป๋า",
  "โทรศัพท์",
  "กุญแจ",
  "บัตรนักศึกษา",
  "อุปกรณ์การเรียน",
  "หูฟัง / อุปกรณ์อิเล็กทรอนิกส์",
  "ยานพาหนะ",
  "สัตว์เลี้ยง",
  "เสื้อผ้า / เครื่องประดับ",
  "อื่น ๆ",
];

export default function ReportPage() {
  const [type, setType] = useState<ReportType>("lost");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationFailed, setVerificationFailed] = useState(false);

  useEffect(() => {
    // The date input is set on the client to avoid server/client timezone mismatches.
    setDate(new Date().toLocaleDateString("en-CA"));
  }, []);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setSuccess(false);

    if (!file) {
      setImageFile(null);
      setImage("");
      setImageName("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("ไฟล์ที่เลือกต้องเป็นรูปภาพนะ");
      event.target.value = "";
      setImageFile(null);
      setImage("");
      setImageName("");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("รูปภาพต้องมีขนาดไม่เกิน 3 MB ลองเลือกรูปที่เล็กกว่านี้นะ");
      event.target.value = "";
      setImageFile(null);
      setImage("");
      setImageName("");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : "");
      setImageName(file.name);
    };
    reader.onerror = () => setError("อ่านรูปภาพไม่สำเร็จ ลองเลือกไฟล์ใหม่อีกครั้ง");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isSubmitting) return;
  setIsSubmitting(true);
    setError("");
    setSuccess(false);
    setVerificationNotice("");
    setVerificationFailed(false);

    if (
      !name.trim() ||
      !category ||
      !color.trim() ||
      !description.trim() ||
      !location.trim() ||
      !date ||
      !contact.trim()
    ) {
      setError("กรอกข้อมูลที่มีเครื่องหมาย * ให้ครบก่อนส่งแบบฟอร์มนะ");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // ต้องมี session เพื่อผูกผู้สร้างรายการกับบัญชีที่ล็อกอิน
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("กรุณาเข้าสู่ระบบก่อนแจ้งรายการ เพื่อบันทึกเจ้าของรายการให้ถูกต้อง");
        return;
      }

      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      // อัปโหลดไฟล์จริงไป Supabase Storage ก่อน แล้วจึงบันทึก URL ลงตาราง items
      if (imageFile) {
        const extensionFromName = imageFile.name.split(".").pop()?.toLowerCase();
        const safeExtension =
          extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)
            ? extensionFromName
            : "jpg";
        const filePath = `reports/${crypto.randomUUID()}.${safeExtension}`;

        const { data: uploadedFile, error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) {
          console.error("Supabase image upload error:", uploadError);
          setError(
            `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message} ตรวจสอบว่ามี Storage bucket ชื่อ item-images และตั้งค่าให้เข้าถึงรูปได้`
          );
          return;
        }

        imagePath = uploadedFile.path;
        const { data: publicUrlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(uploadedFile.path);
        imageUrl = publicUrlData.publicUrl;
      }

      // ไม่บันทึกข้อมูลติดต่อส่วนตัวลงในตารางสาธารณะ
      const { data: insertedData, error: databaseError } = await supabase
        .from("items")
        .insert({
          name: name.trim(),
          category,
          type,
          location: location.trim(),
          date,
          image: imageUrl,
          image_path: imagePath,
          card_color: "#F3ECFF",
          color_name: color.trim(),
          description: [
            description.trim(),
            brand.trim() ? `ยี่ห้อ/รุ่น: ${brand.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          status: "active",
          created_by: user.id,
        })
        .select("id, name, type, status, image, image_path, created_by")
.single();

      if (databaseError) {
        console.error("Supabase insert error:", databaseError);
        setError(`บันทึกลงฐานข้อมูลไม่สำเร็จ: ${databaseError.message}`);
        return;
      }

      console.log("Supabase insert success:", insertedData);
      console.log("Findly creator check:", {
        authUserId: user.id,
        savedCreatedBy: insertedData?.created_by,
      });

      // ตรวจไม่ให้แจ้งว่าสำเร็จ หากฐานข้อมูลไม่ได้คืนค่าเจ้าของรายการกลับมา
      if (!insertedData?.created_by || insertedData.created_by !== user.id) {
        console.error("created_by mismatch after insert", {
          authUserId: user.id,
          savedCreatedBy: insertedData?.created_by,
          itemId: insertedData?.id,
        });
        setError(
          "บันทึกรายการแล้ว แต่ระบบยืนยันเจ้าของรายการไม่สำเร็จ กรุณารีเฟรชหน้าและลองอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ"
        );
        return;
      }

      // ถ้าเป็นรายการที่พบของ ให้ AI สร้างคำถามยืนยันเจ้าของและบันทึกลงฐานข้อมูล
      // หาก AI มีปัญหา จะยังคงถือว่าการแจ้งสิ่งของสำเร็จ เพราะรายการถูกบันทึกแล้ว
      if (type === "found") {
        try {
          const aiResponse = await fetch("/api/verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: Number(insertedData.id) }),
          });
          let aiResult: { success?: boolean; error?: string; questions?: unknown } = {};
          const responseText = await aiResponse.text();
          try {
            aiResult = responseText
              ? (JSON.parse(responseText) as typeof aiResult)
              : {};
          } catch {
            aiResult = { error: responseText || "เซิร์ฟเวอร์ไม่ได้ส่งรายละเอียดกลับมา" };
          }

          if (!aiResponse.ok || !aiResult.success) {
            console.error("Findly AI verification generation failed:", {
              status: aiResponse.status,
              statusText: aiResponse.statusText,
              result: aiResult,
            });
            setVerificationFailed(true);
            setVerificationNotice(
              `บันทึกประกาศแล้ว แต่สร้างคำถาม AI ไม่สำเร็จ (HTTP ${aiResponse.status})${aiResult.error ? `: ${aiResult.error}` : " กรุณาตรวจสอบ Terminal ของเซิร์ฟเวอร์"}`
            );
          } else {
            setVerificationFailed(false);
            setVerificationNotice(
              "AI สร้างและบันทึกคำถามยืนยันความเป็นเจ้าของ 5 ข้อเรียบร้อยแล้ว"
            );
          }
        } catch (aiError) {
          console.error("Findly AI verification request error:", aiError);
          setVerificationFailed(true);
          setVerificationNotice(
            "บันทึกประกาศแล้ว แต่ยังเชื่อมต่อ AI ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์ภายหลัง"
          );
        }
      } else {
        setVerificationNotice("");
        setVerificationFailed(false);
      }

      // เก็บสำเนาไว้ในเบราว์เซอร์เครื่องนี้ด้วย โดยใช้ URL ที่ทุกอุปกรณ์เข้าถึงได้
      const report: SavedReport = {
        id: `report-${Date.now()}`,
        type,
        name: name.trim(),
        category,
        color: color.trim(),
        brand: brand.trim(),
        description: description.trim(),
        location: location.trim(),
        date,
        contact: contact.trim(),
        image: imageUrl ?? image,
        createdAt: new Date().toISOString(),
      };

      const existing = localStorage.getItem("findly_reports");
      const parsed: unknown = existing ? JSON.parse(existing) : [];
      const reports: SavedReport[] = Array.isArray(parsed) ? parsed : [];

      localStorage.setItem(
        "findly_reports",
        JSON.stringify([report, ...reports])
      );

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
      console.error("Findly report error:", error);
      setError(
        "เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setType("lost");
    setName("");
    setCategory("");
    setColor("");
    setBrand("");
    setDescription("");
    setLocation("");
    setDate(new Date().toLocaleDateString("en-CA"));
    setContact("");
    setImage("");
    setImageFile(null);
    setImageName("");
    setError("");
    setSuccess(false);
    setVerificationNotice("");
    setVerificationFailed(false);
  }

  return (
    <main className="page-canvas relative min-h-screen overflow-x-clip bg-[#FFFAF7] text-[#493D55]">
      <style jsx>{`
        .page-canvas {
          background-image:
            radial-gradient(circle at 4% 18%, rgba(247, 220, 235, 0.55) 0 78px, transparent 80px),
            radial-gradient(circle at 96% 42%, rgba(229, 221, 251, 0.62) 0 96px, transparent 98px),
            radial-gradient(circle at 14% 78%, rgba(221, 245, 236, 0.55) 0 56px, transparent 58px),
            radial-gradient(circle at 88% 88%, rgba(255, 240, 201, 0.52) 0 46px, transparent 48px);
          background-size: 100% 900px;
          background-repeat: repeat-y;
        }
        .soft-card {
          box-shadow: 0 16px 45px rgba(116, 88, 143, 0.09);
        }
        .page-decoration {
          position: absolute;
          z-index: 0;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(1px);
          opacity: 0.62;
        }
        .decoration-dot {
          position: absolute;
          z-index: 0;
          pointer-events: none;
          color: #c6b0f5;
          opacity: 0.72;
          font-size: 18px;
        }
        .mock-ad {
  position: relative;
  isolation: isolate;
  border: 1px solid #eadff1;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.97),
    rgba(250, 244, 255, 0.97)
  );
  box-shadow: 0 10px 30px rgba(116, 88, 143, 0.08);
  transition:
    transform 250ms ease,
    box-shadow 250ms ease;
  animation: ad-float 4s ease-in-out infinite;
}

/* สลับจังหวะให้โฆษณาแต่ละใบไม่ลอยพร้อมกัน */
aside[aria-label="โฆษณาร้านเครื่องดื่มตัวอย่าง"] .mock-ad {
  animation-delay: -2s;
}

/* แสงวิบวับที่วิ่งผ่านตัวการ์ด */
.mock-ad::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 25%,
    rgba(255, 255, 255, 0.38) 45%,
    transparent 65%
  );
  transform: translateX(-120%);
  animation: ad-shimmer 6s ease-in-out infinite;
  animation-delay: 1s;
}

/* ยกตัวขึ้นเมื่อเอาเมาส์ชี้ */
.mock-ad:hover {
  transform: translateY(-5px) scale(1.01);
  box-shadow: 0 18px 38px rgba(116, 88, 143, 0.16);
  animation-play-state: paused;
}

/* ให้ภาพสินค้าขยับซูมเข้าออกนิดเดียว */
.mock-ad img {
  transition: transform 500ms ease;
}

.mock-ad:hover img {
  transform: scale(1.06);
}

/* แอนิเมชันลอยขึ้นลง */
@keyframes ad-float {
  0%, 100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -6px;
  }
}

/* แสงวิ่งผ่านการ์ดเป็นระยะ */
@keyframes ad-shimmer {
  0%, 65%, 100% {
    transform: translateX(-120%);
  }
  85% {
    transform: translateX(120%);
  }
}

/* ปิดการเคลื่อนไหวหากผู้ใช้ตั้งค่าให้ลดแอนิเมชัน */
@media (prefers-reduced-motion: reduce) {
  .mock-ad,
  .mock-ad::after {
    animation: none;
  }

  .mock-ad img {
    transition: none;
  }

  .mock-ad:hover {
    transform: none;
  }
}
        .field {
          width: 100%;
          border: 1px solid #eadfec;
          border-radius: 15px;
          background: #fff;
          padding: 12px 14px;
          color: #493d55;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .field:focus {
          border-color: #b9a0f8;
          box-shadow: 0 0 0 3px rgba(185, 160, 248, 0.18);
        }
        .field::placeholder {
          color: #b5a9bd;
        }
        .field-label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 750;
          color: #655570;
        }
        .type-button {
          border: 1px solid #eadfec;
          border-radius: 17px;
          background: #fff;
          padding: 15px;
          text-align: left;
          transition: all 180ms ease;
        }
        .type-button:hover {
          transform: translateY(-2px);
        }
        .type-button.active-lost {
          border-color: #b9a0f8;
          background: #f5f0ff;
          box-shadow: 0 0 0 2px rgba(185, 160, 248, 0.18);
        }
        .type-button.active-found {
          border-color: #8ed8c2;
          background: #effcf7;
          box-shadow: 0 0 0 2px rgba(142, 216, 194, 0.18);
        }
        @media (prefers-reduced-motion: reduce) {
          .field, .type-button { transition: none; }
          .type-button:hover { transform: none; }
        }
      `}</style>

      <header className="border-b border-[#F0E7F1] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="กลับหน้าแรก Findly">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0E8FF] text-2xl">🔎</span>
            <span className="flex flex-col">
              <span className="text-2xl font-black leading-none tracking-tight">findly<span className="text-[#B9A0F8]">.</span></span>
              <span className="mt-1 text-[9px] font-extrabold tracking-[2px] text-[#9B8AAF]">LOST &amp; FOUND HUB</span>
            </span>
          </Link>
          <Link href="/items" className="rounded-full border border-[#E9DFF0] px-4 py-2 text-sm font-bold transition hover:bg-[#F7F1FF]">
            ค้นหาสิ่งของ <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span className="page-decoration left-[-90px] top-[180px] h-64 w-64 bg-[#F7DCEB]" />
        <span className="page-decoration right-[-100px] top-[330px] h-72 w-72 bg-[#E5DDFB]" />
        <span className="page-decoration left-[7%] top-[760px] h-36 w-36 bg-[#DDF5EC]" />
        <span className="page-decoration right-[9%] top-[1040px] h-28 w-28 bg-[#FFF0C9]" />
        <span className="page-decoration left-[24%] top-[1320px] h-24 w-24 bg-[#F7DCEB]" />
        <span className="page-decoration right-[26%] top-[1580px] h-36 w-36 bg-[#DDF5EC]" />
        <span className="page-decoration left-[-55px] top-[1900px] h-44 w-44 bg-[#E5DDFB]" />
        <span className="page-decoration right-[-45px] top-[2180px] h-40 w-40 bg-[#FFF0C9]" />
        <span className="page-decoration left-[14%] top-[2520px] h-28 w-28 bg-[#DDF5EC]" />
        <span className="decoration-dot left-[12%] top-[145px]">✦</span>
        <span className="decoration-dot right-[13%] top-[360px] text-[#E8A9C2]">✧</span>
        <span className="decoration-dot right-[7%] top-[820px] text-[#8DCDB9]">✦</span>
        <span className="decoration-dot left-[5%] top-[1120px] text-[#E8A9C2]">✧</span>
        <span className="decoration-dot right-[17%] top-[1450px]">✦</span>
        <span className="decoration-dot left-[18%] top-[1810px] text-[#8DCDB9]">✧</span>
        <span className="decoration-dot right-[8%] top-[2110px] text-[#E8A9C2]">✦</span>
        <span className="decoration-dot left-[8%] top-[2420px]">✧</span>
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 items-start gap-6 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 xl:grid-cols-[210px_minmax(0,880px)_210px] xl:justify-center xl:gap-7">
        <aside aria-label="โฆษณาร้านเครื่องเขียนตัวอย่าง" className="hidden xl:block xl:sticky xl:top-8">
          <div className="mock-ad overflow-hidden rounded-[24px]">
            <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF0D4] via-[#FFE4E8] to-[#EDE4FF]">
              <span className="absolute -left-5 -top-8 h-28 w-28 rounded-full bg-white/50" />
              <span className="absolute -bottom-8 -right-3 h-28 w-28 rounded-full bg-[#C9B8F5]/40" />
             <img
  src="/images/stationery.webp"
  alt="ภาพถ่ายอุปกรณ์การเรียนสำหรับโฆษณาร้านเครื่องเขียน"
  className="relative z-10 h-44 w-full object-cover"
  loading="lazy"
/>
            </div>
            <div className="p-4">
              <span className="rounded-full bg-[#F0E8FF] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-[#8064B5]">CAMPUS PICK</span>
              <h2 className="mt-3 text-base font-black leading-6">เติมอุปกรณ์ให้พร้อม<br/>ทุกคลาสเรียน</h2>
              <p className="mt-2 text-xs leading-5 text-[#8B7D94]">สมุด ปากกา และของใช้จำเป็นสำหรับชีวิตนักศึกษา</p>
              <div className="mt-4 rounded-xl bg-white/80 p-3"><p className="text-[10px] font-semibold text-[#9B8AAF]">ชุดเครื่องเขียนเริ่มต้น</p><p className="mt-1 text-xl font-black text-[#8B72B8]">฿99 <span className="text-[10px] font-semibold text-[#B5A9BD]">/ เซต</span></p></div>
              <div className="mt-3 rounded-full bg-[#B9A0F8] px-3 py-2.5 text-center text-xs font-extrabold text-white">ดูสินค้าแนะนำ ↗</div>
              <p className="mt-3 text-center text-[9px] text-[#B5A9BD]">พื้นที่โฆษณาจำลอง</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 w-full">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F0E8FF] px-4 py-2 text-xs font-extrabold tracking-wide text-[#8064B5]">
            ✦ LET’S BRING IT BACK
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">ช่วยกันตามหาสิ่งของกันเถอะ!</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8B7D94] sm:text-base">
            แจ้งรายละเอียดให้ครบ เพื่อช่วยให้เจ้าของและสิ่งของได้กลับมาเจอกันอีกครั้ง 💜
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
  <aside aria-label="โฆษณาร้านเครื่องเขียนตัวอย่าง" className="mock-ad overflow-hidden rounded-[22px]">
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#FFF0D4] to-[#F7E9FF] p-3">
      <img
        src="/images/stationery.webp"
        alt="ภาพถ่ายอุปกรณ์การเรียน"
        className="h-20 w-24 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
      <div>
        <span className="text-[9px] font-extrabold tracking-wide text-[#8064B5]">CAMPUS PICK</span>
        <h2 className="mt-1 text-sm font-black">เครื่องเขียนพร้อมเรียน</h2>
        <p className="mt-1 text-xs font-bold text-[#8B72B8]">เริ่มต้น ฿99 / เซต</p>
      </div>
    </div>
  </aside>

  <aside aria-label="โฆษณาร้านเครื่องดื่มตัวอย่าง" className="mock-ad overflow-hidden rounded-[22px]">
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#DDF5EC] to-[#FFF0D4] p-3">
      <img
        src="https://images.unsplash.com/photo-1771405317950-04de06a70166?auto=format&fit=crop&w=360&h=260&q=80"
        alt="ภาพถ่ายกาแฟเย็นสำหรับโฆษณาร้านเครื่องดื่ม"
        className="h-20 w-24 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
      <div>
        <span className="text-[9px] font-extrabold tracking-wide text-[#26765F]">BREAK TIME</span>
        <h2 className="mt-1 text-sm font-black">พักเติมพลังระหว่างวัน</h2>
        <p className="mt-1 text-xs font-bold text-[#477D6E]">เมนูแนะนำเริ่มต้น ฿45</p>
      </div>
    </div>
  </aside>
</div>


        {success && (
          <div role="status" className="mb-6 rounded-2xl border border-[#BDE8D8] bg-[#EEFCF6] p-5">
            <div className="flex gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <h2 className="font-extrabold text-[#26765F]">บันทึกแบบฟอร์มเรียบร้อยแล้ว!</h2>
                <p className="mt-1 text-sm leading-6 text-[#477D6E]">
                  บันทึกข้อมูลลงฐานข้อมูลแล้ว คุณสามารถไปหน้าค้นหาสิ่งของเพื่อตรวจสอบรายการได้
                </p>
                {type === "found" && verificationNotice && (
                  <p
                    role={verificationFailed ? "alert" : "status"}
                    className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-6 ${
                      verificationFailed
                        ? "border-[#F4C6CF] bg-[#FFF0F3] text-[#A83E59]"
                        : "border-[#BDE8D8] bg-white text-[#26765F]"
                    }`}
                  >
                    {verificationFailed ? "⚠️ " : "✨ "}
                    {verificationNotice}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/items" className="rounded-full bg-[#B9A0F8] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a58be8]">
                    ไปหน้าค้นหาสิ่งของ
                  </Link>
                  <button type="button" onClick={resetForm} className="rounded-full border border-[#BDE8D8] px-4 py-2 text-sm font-bold text-[#26765F] hover:bg-white">
                    แจ้งรายการใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-[#F4C6CF] bg-[#FFF0F3] px-4 py-3 text-sm font-semibold text-[#A83E59]">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="soft-card rounded-[28px] border border-[#F0E7F1] bg-white p-5 sm:p-9">
          <div>
            <h2 className="text-lg font-black">เริ่มจากเลือกประเภทการแจ้ง</h2>
            <p className="mt-1 text-sm text-[#9B8AAF]">เลือกให้ตรงกับสิ่งที่เกิดขึ้นนะ</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { setType("lost"); setSuccess(false); }} className={`type-button ${type === "lost" ? "active-lost" : ""}`}>
                <span className="text-2xl">🥹</span>
                <span className="mt-2 block font-extrabold">ฉันทำของหาย</span>
                <span className="mt-1 block text-xs leading-5 text-[#95869F]">ช่วยตามหาของที่หายไป</span>
              </button>
              <button type="button" onClick={() => { setType("found"); setSuccess(false); }} className={`type-button ${type === "found" ? "active-found" : ""}`}>
                <span className="text-2xl">🎁</span>
                <span className="mt-2 block font-extrabold">พบของที่ยังไม่รู้เจ้าของ</span>
                <span className="mt-1 block text-xs leading-5 text-[#95869F]">ช่วยตามหาเจ้าของสิ่งของ</span>
              </button>
            </div>
          </div>

          <div className="my-7 border-t border-dashed border-[#E9DFED]" />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="item-name">ชื่อสิ่งของ <span className="text-[#E58CA3]">*</span></label>
              <input id="item-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กระเป๋าสะพายสีชมพู" required maxLength={100} />
            </div>

            <div>
              <label className="field-label" htmlFor="category">หมวดหมู่ <span className="text-[#E58CA3]">*</span></label>
              <select id="category" className="field" value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="color">สีของสิ่งของ <span className="text-[#E58CA3]">*</span></label>
              <input id="color" className="field" value={color} onChange={(e) => setColor(e.target.value)} placeholder="เช่น ชมพูอ่อน" required maxLength={60} />
            </div>

            <div>
              <label className="field-label" htmlFor="brand">ยี่ห้อ / รุ่น <span className="text-xs font-medium text-[#B5A9BD]">(ถ้ามี)</span></label>
              <input id="brand" className="field" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="เช่น Apple, Nike หรือไม่ทราบ" maxLength={100} />
            </div>

            <div>
              <label className="field-label" htmlFor="date">{type === "lost" ? "วันที่ของหาย" : "วันที่พบสิ่งของ"} <span className="text-[#E58CA3]">*</span></label>
              <input id="date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="location">{type === "lost" ? "สถานที่ที่คาดว่าทำหาย" : "สถานที่ที่พบสิ่งของ"} <span className="text-[#E58CA3]">*</span></label>
              <input id="location" className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="เช่น ห้องสมุด ชั้น 2 หรือหน้าโรงอาหาร" required maxLength={160} />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="description">รายละเอียดเพิ่มเติม <span className="text-[#E58CA3]">*</span></label>
              <textarea id="description" className="field min-h-28 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ลักษณะเด่น ตำหนิ สิ่งของข้างใน หรือข้อมูลที่ช่วยระบุสิ่งของได้" required maxLength={1000} />
              <p className="mt-1 text-right text-xs text-[#B5A9BD]">{description.length}/1000 ตัวอักษร</p>
            </div>

            <div className="sm:col-span-2">
              <span className="field-label">รูปภาพสิ่งของ <span className="text-xs font-medium text-[#B5A9BD]">(ไม่บังคับ · สูงสุด 3 MB)</span></span>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DCCCF0] bg-[#FCF9FF] px-5 py-7 text-center transition hover:border-[#B9A0F8] hover:bg-[#F7F1FF]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="ตัวอย่างรูปสิ่งของที่เลือก" className="mb-3 max-h-56 max-w-full rounded-xl object-contain" />
                ) : (
                  <span className="mb-2 text-3xl">📷</span>
                )}
                <span className="font-extrabold">{imageName || "แตะเพื่อเลือกรูปภาพ"}</span>
                <span className="mt-1 text-xs text-[#9B8AAF]">รองรับไฟล์รูปภาพจากอุปกรณ์ของคุณ</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </label>
              {image && <button type="button" onClick={() => { setImage(""); setImageName(""); }} className="mt-2 text-xs font-bold text-[#B65D7B] underline">นำรูปออก</button>}
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="contact">ช่องทางติดต่อ <span className="text-[#E58CA3]">*</span></label>
              <input id="contact" className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="เช่น LINE ID หรืออีเมลสำหรับติดต่อกลับ" required maxLength={160} />
              <p className="mt-2 text-xs leading-5 text-[#9B8AAF]">เพื่อความปลอดภัย อย่าใส่รหัสผ่านหรือข้อมูลส่วนตัวที่ไม่จำเป็น และควรใช้ช่องทางติดต่อที่สะดวกให้ผู้อื่นติดต่อกลับ</p>
            </div>
         <button
  type="submit"
  disabled={isSubmitting}
  className="rounded-full bg-[#B9A0F8] px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 transition hover:-translate-y-0.5 hover:bg-[#A58BE8] disabled:cursor-not-allowed disabled:opacity-60"
>
  {isSubmitting ? "กำลังบันทึก..." : "ส่งแบบฟอร์ม"}
  {!isSubmitting && <span aria-hidden="true"> ✦</span>}
</button>
            <Link href="/" className="rounded-full px-5 py-3 text-center text-sm font-bold text-[#8B7D94] transition hover:bg-[#FAF5FC]">
              ← กลับหน้าแรก
            </Link>
            <button type="submit" className="rounded-full bg-[#B9A0F8] px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#B9A0F8]/20 transition hover:-translate-y-0.5 hover:bg-[#A58BE8]">
              ส่งแบบฟอร์ม <span aria-hidden="true">✦</span>
            </button>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-[#B5A9BD]">
            ข้อมูลรายงานจะถูกบันทึกลงระบบ Findly เพื่อให้หน้ารายการสิ่งของนำไปแสดงผล
          </p>
        </form>
        </section>

        <aside aria-label="โฆษณาร้านเครื่องดื่มตัวอย่าง" className="hidden xl:block xl:sticky xl:top-8">
          <div className="mock-ad overflow-hidden rounded-[24px]">
            <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#DDF5EC] via-[#E6F5FF] to-[#FFF0D4]">
              <span className="absolute -left-5 -top-8 h-28 w-28 rounded-full bg-white/50" />
              <span className="absolute -bottom-8 -right-3 h-28 w-28 rounded-full bg-[#F2C6D4]/45" />
              <img src="https://images.unsplash.com/photo-1771405317950-04de06a70166?auto=format&fit=crop&w=900&q=85" alt="ภาพถ่ายกาแฟเย็นสำหรับโฆษณาร้านเครื่องดื่ม" className="relative h-44 w-full object-cover" loading="lazy" />
            </div>
            <div className="p-4">
              <span className="rounded-full bg-[#E4F8F0] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-[#26765F]">BREAK TIME</span>
              <h2 className="mt-3 text-base font-black leading-6">พักเติมพลัง<br/>ระหว่างวันเรียน</h2>
              <p className="mt-2 text-xs leading-5 text-[#8B7D94]">เครื่องดื่มเย็น ๆ สำหรับช่วงพักจากคลาสหรืออ่านหนังสือ</p>
              <div className="mt-4 rounded-xl bg-white/80 p-3"><p className="text-[10px] font-semibold text-[#9B8AAF]">เมนูแนะนำประจำวัน</p><p className="mt-1 text-xl font-black text-[#478F7B]">฿45 <span className="text-[10px] font-semibold text-[#B5A9BD]">/ แก้ว</span></p></div>
              <div className="mt-3 rounded-full bg-[#78BFA7] px-3 py-2.5 text-center text-xs font-extrabold text-white">ดูเมนูแนะนำ ↗</div>
              <p className="mt-3 text-center text-[9px] text-[#B5A9BD]">พื้นที่โฆษณาจำลอง</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
