import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/constants";
import { getCurrentAdmin } from "@/lib/auth/session";

import { PerfilForm } from "./PerfilForm";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(LOGIN_PATH);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Mi perfil</h1>
      <p className="mb-8 text-sm text-muted">
        Tu nombre y tu foto salen en la firma de las notas que publicas. Tus
        redes salen en tu página de autor, la misma a la que lleva esa firma.
      </p>

      <PerfilForm admin={admin} />
    </div>
  );
}
