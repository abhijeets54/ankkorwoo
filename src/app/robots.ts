import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/account/',
        '/cart/',
        '/404',
        '/500',
      ],
    },
    sitemap: 'https://www.ankkor.com/sitemap.xml',
  };
} 