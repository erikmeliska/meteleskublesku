import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: {
    default: "Meteleskublesku Reloaded",
    template: "%s | Meteleskublesku",
  },
  description:
    "Zvukové nahrávky z českých a slovenských filmov. Moderná verzia kultovej stránky meteleskublesku.cz.",
  openGraph: {
    title: "Meteleskublesku Reloaded",
    description: "Zvukové nahrávky z českých a slovenských filmov.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
