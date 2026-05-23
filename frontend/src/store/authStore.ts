import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeRole } from "../lib/authRouting";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  nombre?: string;
  email?: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, user) => {
        const normalizedUser = {
          ...user,
          role: normalizeRole(user.role) ?? user.role,
        };

        window.localStorage.setItem("token", token);
        window.localStorage.setItem("user", JSON.stringify(normalizedUser));

        set({
          token,
          user: normalizedUser,
        });
      },
      clearAuth: () => {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        set({ token: null, user: null });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "coronados-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
