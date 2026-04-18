"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

interface SuperManagerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export default function AdminSuperManagerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [manager, setManager] = useState<SuperManagerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    api<SuperManagerDetail>(`/admin/users/${id}`, { token })
      .then(setManager)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) return <div className="text-sm text-[#A1A1A1]">Загрузка...</div>;

  if (error || !manager) {
    return (
      <div>
        <p className="text-sm text-[#FA6868]">{error || "Не найден"}</p>
        <Link href="/admin/super-managers" className="text-xs text-[#303030] underline mt-2 inline-block">
          К списку
        </Link>
      </div>
    );
  }

  const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="max-w-[900px]">
      <Link href="/admin/super-managers" className="text-xs text-[#A1A1A1] inline-flex items-center gap-1 hover:text-[#303030]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        К списку
      </Link>
      <h1 className="text-2xl font-medium text-[#303030] mt-2 mb-6">{name}</h1>

      <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#A1A1A1]">Телефон</p>
            <p className="text-[#303030]">{manager.phone}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Email</p>
            <p className="text-[#303030]">{manager.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Роль</p>
            <p className="text-[#303030]">{manager.role}</p>
          </div>
          <div>
            <p className="text-xs text-[#A1A1A1]">Статус</p>
            <Badge variant={manager.status === "ACTIVE" ? "green" : "gray"}>
              {manager.status === "ACTIVE" ? "Активен" : manager.status}
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
