import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const base = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
