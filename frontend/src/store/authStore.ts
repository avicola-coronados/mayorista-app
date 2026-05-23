import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getRoleFromToken, normalizeRole } from "../lib/authRouting";

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
        const roleFromToken = getRoleFromToken(token);
        const normalizedUser = {
          ...user,
          role: normalizeRole(user.role) ?? roleFromToken ?? user.role,
        };

        window.localStorage.setItem("token", token);
        window.localStorage.setItem("user", JSON.stringify(normalizedUser));

        set({
          token,
          user: normalizedUser,
          hasHydrated: true,
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Pick<AuthState, "token" | "user"> | undefined;
        const token = saved?.token ?? current.token;
        const tokenRole = getRoleFromToken(token);
        const savedUserRole = normalizeRole(saved?.user?.role);
        const user = saved?.user
          ? {
              ...saved.user,
              role: savedUserRole ?? tokenRole ?? saved.user.role,
            }
          : current.user;
        const userRole = normalizeRole(user?.role);

        if (token && userRole && tokenRole && userRole !== tokenRole) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");

          return {
            ...current,
            token: null,
            user: null,
            hasHydrated: true,
          };
        }

        return {
          ...current,
          token,
          user,
          hasHydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
