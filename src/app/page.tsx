import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};
export default function Home() { return <Dashboard />; }
