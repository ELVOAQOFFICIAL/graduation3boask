import type { Metadata } from "next";
import "./globals.css";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Stuzkova — Žiadosti o piesne",
  description: "Platforma pre žiadosti o piesne na Stuzkova",
  icons: {
    icon: "/icon.svg",
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
