import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Media Manager",
  description: "Manage your ads on Facebook, Instagram, and YouTube",
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
