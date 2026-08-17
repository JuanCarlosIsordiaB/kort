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
      <h1 className="mb-1 text-3xl font-extrabold">Mi perfil</h1>
      <p className="mb-8 text-sm text-muted">
        Tu nombre y tu foto salen en la firma de las notas que publicas.
      </p>

      <PerfilForm admin={admin} />
    </div>
  );
}
