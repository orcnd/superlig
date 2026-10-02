import type { MetadataRoute } from "next";
import { teams } from "@/data/teams";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/data", "/methodology", "/sources", ...teams.map((team) => `/takim/${team.slug}`)]
    .map((path) => ({ url: `https://superlig.orcuncandan.com${path}` }));
}
