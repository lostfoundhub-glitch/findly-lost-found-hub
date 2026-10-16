"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClueEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/items/general/clue");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FCFAFF] text-[#49376F]">
      กำลังเปิดหน้าแจ้งเบาะแส...
    </main>
  );
}