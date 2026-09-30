import { Suspense } from "react";
import { DataExplorer } from "@/components/data-explorer";
export default function DataPage(){return <Suspense fallback={<main><p>Veri yükleniyor…</p></main>}><DataExplorer/></Suspense>}
