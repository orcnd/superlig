import type { Metadata } from "next";

export const metadata: Metadata = { title: "Veri kaynakları ve doğrulama", description: "Süper Lig endeksinde kullanılan TFF, FotMob ve diğer kaynaklara doğrudan erişin.", alternates: { canonical: "/sources" } };
export default function SourcesLayout({ children }: { children: React.ReactNode }) { return children; }
