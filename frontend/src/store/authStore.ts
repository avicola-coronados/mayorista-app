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
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) =>
        set({
          token,
          user: {
            ...user,
            role: normalizeRole(user.role) ?? user.role,
          },
        }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "coronados-auth",
    },
  ),
);
