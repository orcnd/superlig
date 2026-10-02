import type { Metadata } from "next";

export const metadata: Metadata = { title: "Süper Lig olayları ve veri gezgini", description: "Penaltı, kart ve doğrulanmış ceza kayıtlarını kaynaklarıyla inceleyin.", alternates: { canonical: "/data" } };
export default function DataLayout({ children }: { children: React.ReactNode }) { return children; }
