import type { MetadataRoute } from "next";
import sobrietyChipsData from "@/json/sobriety-chips.json";
import { SOBRIETY_CARDS } from "@/lib/sobriety-card-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = [
    {
      url: "https://gratefultoday.com",
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://gratefultoday.com/sobriety-chips",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://gratefultoday.com/sobriety-cards",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://gratefultoday.com/sobriety-counter",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gratefultoday.com/wall",
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://gratefultoday.com/newsletter",
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://gratefultoday.com/support",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://gratefultoday.com/about",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://gratefultoday.com/privacy",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: "https://gratefultoday.com/terms",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  return [
    ...pages,
    ...sobrietyChipsData.map((chip) => ({
      url: `https://gratefultoday.com/sobriety-chips/${chip.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...SOBRIETY_CARDS.map((card) => ({
      url: `https://gratefultoday.com/sobriety-cards/${card.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
