import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  // Sin `metadataBase`, Next no puede convertir las rutas de og:image en URLs
  // absolutas, y los rastreadores de WhatsApp y Facebook descartan las
  // relativas: el enlace se comparte sin foto.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: "Noticias en corto.",
  openGraph: {
    siteName: SITE_NAME,
    locale: "es_MX",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` porque el script de abajo le pone `data-theme`
    // al <html> antes de que React hidrate: le dice a React que se quede con lo
    // que ya está en el DOM en vez de tratarlo como un error de hidratación.
    <html
      lang="es"
      className={`${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Debe ir en <head> y ser síncrono: si corriera después, el usuario
            alcanzaría a ver un destello con el tema equivocado. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/*
        `suppressHydrationWarning` aquí es por las extensiones del navegador, no
        por nuestro código: Grammarly y similares le cuelgan atributos al <body>
        (`data-gr-ext-installed`, `data-new-gr-c-s-check-loaded`) antes de que
        React hidrate, y React lo reporta como desajuste.

        Cuesta nada porque solo aplica a este elemento y un nivel de
        profundidad: el className del <body> es una cadena fija, así que no hay
        ningún desajuste real que se pueda estar escondiendo, y los de los hijos
        se siguen reportando igual.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
