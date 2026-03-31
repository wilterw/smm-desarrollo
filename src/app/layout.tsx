import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Media Manager IA",
  description: "Publicaciones diarias y campañas de pago automatizadas para el ecosistema Digital Estate IA.",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Social Media Manager IA",
    description: "Publicaciones diarias y campañas de pago automatizadas para el ecosistema Digital Estate IA.",
    images: [
      {
        url: "/images/logo-smm.jpg",
        width: 1200,
        height: 630,
        alt: "Social Media Manager IA Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Media Manager IA",
    description: "Publicaciones diarias y campañas de pago automatizadas para el ecosistema Digital Estate IA.",
    images: ["/images/logo-smm.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen bg-neutral-900 text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
