import { randomUUID } from "node:crypto";

import { requireAdmin } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "news-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return Response.json(
      { error: `Formato no permitido (${file.type || "desconocido"}). Usa JPG, PNG, WebP o AVIF.` },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: "La imagen supera los 5 MB" }, { status: 413 });
  }

  // Nombre aleatorio: el nombre original puede traer acentos, espacios o
  // colisionar con otro archivo ya subido.
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${new Date().getFullYear()}/${randomUUID()}.${extension}`;

  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return Response.json({ error: `No se pudo subir: ${error.message}` }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path);

  return Response.json({ url: publicUrl }, { status: 201 });
}
