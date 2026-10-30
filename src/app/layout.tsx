import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";
import { DEMO_MODE } from "@/lib/mode";

export const metadata: Metadata = {
  title: { default: "Telar", template: "%s · Telar" },
  description: "Tu oficina armada desde el primer minuto: páginas, tareas y conversaciones del equipo en un solo lugar.",
  applicationName: "Telar",
  robots: DEMO_MODE ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1917" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
