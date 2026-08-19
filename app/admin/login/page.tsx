import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar al panel",
  // Fuera de los buscadores: una pantalla de acceso indexada no le sirve a
  // nadie más que a quien busca la puerta.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="admin-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-[var(--radius-frame)] border border-border p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">Kort</h1>
        <p className="mt-1 mb-6 text-sm font-semibold text-muted">Panel de administración</p>
        {/* LoginForm lee `?next=` con useSearchParams, que exige un límite de
            Suspense para no forzar el render dinámico de toda la página. */}
        <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
