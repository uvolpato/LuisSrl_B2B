import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/siteConfig';
import { getFamiglie } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const famiglie = await getFamiglie();
  return [
    { url: SITE.url, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/catalogo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE.url}/cookie`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    ...(famiglie ?? []).map((f) => ({
      url: `${SITE.url}/collezioni/${f.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
