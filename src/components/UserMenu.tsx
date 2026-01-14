"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  displayName: string | null;
}

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        {user.displayName || user.username}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
      >
        {isLoading ? "..." : "ログアウト"}
      </button>
    </div>
  );
}
