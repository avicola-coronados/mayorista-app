import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiClient } from "../services/api";
import { useAuthStore } from "../store/authStore";

export function Login() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const loginMutation = useMutation({
    mutationFn: () => apiClient.login(form.username.trim(), form.password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success("Sesión iniciada");
      navigate(data.user.role === "admin" ? "/admin" : "/");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    document.title = "Ingreso | Coronados";

    if (window.sessionStorage.getItem("auth-expired") === "1") {
      window.sessionStorage.removeItem("auth-expired");
      toast.error("Sesión expirada, ingresa nuevamente");
    }
  }, []);

  if (token) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      toast.error("Ingresa usuario y contraseña");
      return;
    }

    loginMutation.mutate();
  }

  if (showForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#d8d8d8] px-2 py-1">
        <main className="flex min-h-[672px] w-full max-w-[868px] flex-col overflow-hidden rounded-[12px] bg-white shadow-soft">
          <header className="flex min-h-[198px] flex-col items-center justify-center bg-coronados-orange px-6 py-8 text-center text-white">
            <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-[6px] border-white bg-[#fff7ed]">
              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-dashed border-coronados-green text-[10px] font-bold leading-tight text-coronados-green">
                <span>
                  Frescura
                  <br />
                  Garantizada
                </span>
              </div>
            </div>
            <h1 className="mt-5 text-[22px] font-bold leading-none sm:text-[24px]">
              Coronados Avícola
            </h1>
            <p className="mt-2 text-[14px] font-semibold sm:text-[16px]">Control de ventas</p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 py-5 sm:px-7">
            <div className="flex min-h-[42px] items-center gap-3 rounded-[8px] border border-coronados-orange/60 bg-orange-50 px-3 text-[14px] font-medium text-red-700 sm:text-[16px]">
              <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-coronados-orange" />
              <span>Ingresa con tu usuario asignado por el administrador</span>
            </div>

            <label htmlFor="username" className="mt-4 text-[13px] font-bold text-neutral-500 sm:text-[15px]">
              Usuario
            </label>
            <input
              id="username"
              className="mt-1 h-[45px] rounded-[8px] border border-coronados-orange px-3 text-[16px] font-semibold text-slate-900 outline-none transition focus:ring-4 focus:ring-orange-100 sm:text-[18px]"
              placeholder="carlos_operario"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
            />

            <label htmlFor="password" className="mt-3 text-[13px] font-bold text-neutral-500 sm:text-[15px]">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 h-[45px] rounded-[8px] border border-neutral-200 px-3 text-[16px] font-semibold text-slate-900 outline-none transition placeholder:text-neutral-300 focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 sm:text-[18px]"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
            />

            <button
              type="submit"
              className="mt-3 flex h-[51px] items-center justify-center rounded-[9px] bg-coronados-orange text-[18px] font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-[20px]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
            </button>

            <p className="mt-4 text-center text-[14px] font-semibold text-coronados-green sm:text-[16px]">
              ¿Olvidaste tu contraseña? Contacta al admin
            </p>

            <div className="mt-4 border-t border-neutral-100 pt-3">
              <p className="text-center text-[12px] font-semibold text-neutral-300 sm:text-[14px]">
                Tu vista depende de tu rol
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex min-h-[91px] flex-col items-center justify-center rounded-[8px] border border-coronados-orange/50 bg-orange-50 text-center">
                  <span className="h-[28px] w-[28px] rounded-full bg-coronados-orange" />
                  <p className="mt-2 text-[14px] font-bold text-coronados-orange sm:text-[16px]">
                    Operario
                  </p>
                  <p className="text-[12px] font-medium text-coronados-orange sm:text-[14px]">
                    Pesadas del día
                  </p>
                </div>

                <div className="flex min-h-[91px] flex-col items-center justify-center rounded-[8px] border border-green-400 bg-green-50 text-center">
                  <span className="h-[28px] w-[28px] rounded-full bg-coronados-green" />
                  <p className="mt-2 text-[14px] font-bold text-coronados-green sm:text-[16px]">
                    Admin
                  </p>
                  <p className="text-[12px] font-medium text-green-500 sm:text-[14px]">
                    Reportes y config.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coronados-orange">
      <main className="flex min-h-screen w-full flex-col text-white">
        <section className="flex min-h-[66.666vh] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full border-[7px] border-white bg-[#fff7ed] sm:h-[132px] sm:w-[132px]">
            <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-dashed border-coronados-green text-center text-[14px] font-bold leading-tight text-coronados-green sm:h-[96px] sm:w-[96px] sm:text-[16px]">
              <span>
                Frescura
                <br />
                Garantizada
              </span>
            </div>
          </div>

          <h1 className="mt-10 text-[40px] font-bold leading-none sm:text-[54px]">Coronados</h1>
          <p className="mt-3 text-[16px] font-semibold uppercase tracking-[0.38em] sm:text-[19px]">
            Avícola
          </p>
          <p className="mt-9 max-w-[380px] text-[17px] font-semibold italic leading-relaxed sm:text-[20px]">
            "Te atendemos con el mismo
            <br className="hidden sm:block" />
            amor que a nuestra familia"
          </p>
        </section>

        <section className="flex min-h-[33.334vh] flex-col justify-center bg-coronados-green px-6 py-5 sm:px-9 sm:py-6">
          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="mx-auto grid w-full max-w-5xl gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                id="username"
                aria-label="Usuario"
                className="h-[51px] rounded-[10px] border border-white/70 bg-white px-4 text-[16px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/25"
                placeholder="Usuario"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
              />
              <input
                id="password"
                aria-label="Contraseña"
                type="password"
                className="h-[51px] rounded-[10px] border border-white/70 bg-white px-4 text-[16px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-white/25"
                placeholder="Contraseña"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              <button
                type="submit"
                className="h-[51px] rounded-[10px] bg-white px-8 text-[18px] font-bold text-coronados-orange transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Ingresando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="mx-auto flex h-[56px] w-full max-w-5xl items-center justify-center rounded-[10px] bg-white text-[18px] font-bold text-coronados-orange transition hover:bg-orange-50 sm:h-[60px] sm:text-[20px]"
              onClick={() => setShowForm(true)}
            >
              Iniciar sesión
            </button>
          )}

          <p className="mt-3 text-center text-[14px] font-medium text-white/85 sm:text-[16px]">
            Sistema de control de ventas mayoristas
          </p>
        </section>
      </main>
    </div>
  );
}
