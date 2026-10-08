import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BODA } from "@/config/boda";
import "@/app/globals.css";
import { getDictionary } from "@/dictionaries/getDictionary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // Cargamos directamente el diccionario en español
  const dict = await getDictionary('es');
  const TITULO = `${BODA.nombres} · ${dict.config.fechaTexto}`;
  const NOMBRE_APP = `Boda ${BODA.nombres}`;

  return {
    metadataBase: new URL(BODA.url),
    title: TITULO,
    description: dict.config.descripcion,
    applicationName: NOMBRE_APP,
    openGraph: {
      type: "website",
      locale: 'es_ES',
      url: BODA.url,
      siteName: NOMBRE_APP,
      title: TITULO,
      description: dict.config.descripcion,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#436445",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}