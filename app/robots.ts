import type { MetadataRoute } from "next";

import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * Qué puede rastrear un buscador.
 *
 * `/admin` y `/api` quedan fuera: no son páginas para lectores y aparecer en
 * los resultados solo le regala a cualquiera la puerta del panel. El bloqueo es
 * de rastreo, no de seguridad — quien protege esas rutas es la sesión.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
