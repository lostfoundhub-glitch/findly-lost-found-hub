"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({
  children,
}: RequireAuthProps) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !user) {
          setAuthenticated(false);
          router.replace("/login");
          return;
        }

        setAuthenticated(true);
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (mounted) {
          setAuthenticated(false);
          router.replace("/login");
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    void checkUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF7] px-4 text-[#49376F]">
        <div className="text-center">
          <div className="mb-4 text-5xl">🔎</div>

          <p className="text-lg font-bold">
            กำลังตรวจสอบบัญชีของคุณ...
          </p>

          <p className="mt-2 text-sm text-[#91859F]">
            กรุณารอสักครู่
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}