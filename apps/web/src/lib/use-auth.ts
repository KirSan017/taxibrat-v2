"use client";

import { useEffect, useState } from "react";
import { getAccessToken, setTokens, clearTokens } from "./auth";
import { api } from "./api-client";

export interface User {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  friendshipPoints: number;
  referralCode: string;
  photoUrl: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<User>("/users/me", { token })
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const refetch = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return { user, loading, logout, refetch, setTokens };
}
