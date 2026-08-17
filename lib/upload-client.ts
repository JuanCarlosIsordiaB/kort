/**
 * Sube una imagen a Supabase Storage vía /api/upload y devuelve su URL pública.
 * Se usa desde el navegador: tanto para la portada como para las imágenes que
 * se insertan en el cuerpo desde el editor.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error ?? "No se pudo subir la imagen");
  }

  return body.url as string;
}
