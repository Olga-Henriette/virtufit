import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VirtuFit — Essayage virtuel 3D",
  description:
    "Plateforme d'essayage virtuel 3D — créez votre avatar, essayez des vêtements, trouvez votre taille parfaite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={GeistSans.variable}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}