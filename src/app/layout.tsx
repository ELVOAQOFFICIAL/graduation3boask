import type { Metadata } from "next";
import "./globals.css";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Promočná párty — Žiadosti o piesne",
  description: "Platforma pre žiadosti o piesne na promočnú párty",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className="bg-zinc-900 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
