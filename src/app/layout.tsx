import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://superlig.orcuncandan.com"),
  title: { default: "Süper Lig Avantaj ve Dezavantaj Endeksi | Dört Büyükler", template: "%s | Adil Oyun Endeksi" },
  description: "Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor için üç sezonun doğrulanmış penaltı ve kart-ceza etkilerini kaynaklarıyla karşılaştırın.",
  openGraph: {
    type: "website", locale: "tr_TR", siteName: "Adil Oyun Endeksi",
    title: "Süper Lig Avantaj ve Dezavantaj Endeksi",
    description: "Dört takım, üç sezon: doğrulanmış penaltılar ve önemli oyuncuların kart-ceza etkileri. Kaynakları ve hesaplama yöntemini inceleyin.",
  },
  twitter: { card: "summary", title: "Süper Lig Avantaj ve Dezavantaj Endeksi" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
