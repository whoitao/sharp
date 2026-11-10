import { getSiteSettings } from "@/lib/site-settings";
import type { MetadataRoute } from "next";
import { connection } from "next/server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const settings = await getSiteSettings();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/learn/"],
    },
    sitemap: new URL("/sitemap.xml", settings.siteUrl).toString(),
  };
}
