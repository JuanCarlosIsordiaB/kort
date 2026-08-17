import type { NextConfig } from "next";

// Las portadas y las imágenes del cuerpo viven en Supabase Storage. `next/image`
// solo carga hosts declarados aquí, así que derivamos el hostname de la misma
// variable que usa el cliente de Supabase en vez de hardcodearlo.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // Hay un pnpm-lock.yaml en C:\Users\juanc, así que Turbopack infiere la
  // carpeta de usuario como raíz del workspace. Se la fijamos a este proyecto.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/news-images/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
