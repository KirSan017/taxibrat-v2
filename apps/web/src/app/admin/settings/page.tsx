"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuccessModal } from "@/components/ui/success-modal";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

/* ── types ────────────────────────────────────────────── */

interface Setting {
  key: string;
  value: string;
}

/* ── page ─────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const loadSettings = () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    api<Setting[] | { data: Setting[] }>("/admin/settings", { token })
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        setSettings(list);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateField = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSave = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await api("/admin/settings", {
        method: "PATCH",
        token,
        body: { updates: settings.map((s) => ({ key: s.key, value: s.value })) },
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Сохранено"
        description="Настройки успешно обновлены"
      />

      <h1 className="text-xl font-medium text-[#303030] mb-6">Настройки сервиса</h1>

      {error && (
        <div className="bg-[#FA6868]/10 border border-[#FA6868]/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#FA6868]">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#A1A1A1] text-center py-12">Загрузка...</p>
      ) : settings.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
          <p className="text-sm text-[#A1A1A1]">Настроек нет</p>
        </div>
      ) : (
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6">
          <div className="space-y-4">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#303030]">{s.key}</p>
                </div>
                <div className="w-[200px]">
                  <Input
                    value={s.value}
                    onChange={(e) => updateField(s.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
