"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ReferralRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    const raw = params?.code;
    const code = Array.isArray(raw) ? raw[0] : raw;
    router.replace(`/?ref=${encodeURIComponent(code ?? "")}`);
  }, [router, params]);
  return <div className="p-8 text-center">Перенаправление...</div>;
}
