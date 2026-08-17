import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar al panel" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[var(--radius-frame)] border border-border p-8">
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
