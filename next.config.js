/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['images.unsplash.com', 'your-wordpress-site.com', 'deepskyblue-penguin-370791.hostingersite.com', 'maroon-lapwing-781450.hostingersite.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },

      {
        protocol: 'https',
        hostname: 'lightpink-eagle-376738.hostingersite.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'deepskyblue-penguin-370791.hostingersite.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maroon-lapwing-781450.hostingersite.com',
        pathname: '/**',
      },
      {
        // Generic pattern for WordPress media files
        protocol: 'https',
        hostname: '**.wp.com',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  
  // Experimental features
  experimental: {
    // External packages to optimize with server components
    serverComponentsExternalPackages: [
      'sharp',

      'graphql-request',
    ],
    
    // Optimization features
    optimizeCss: true,
    serverMinification: true,
    instrumentationHook: true,
  },
  
  // Disable ESLint during build for production deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configure output settings - use 'standalone' for Vercel deployment
  // Temporarily commented out for development - causes "missing required error components" error
  // output: 'standalone',
  
  // Expose environment variables to the browser
  env: {
    LAUNCHING_SOON: process.env.LAUNCHING_SOON || 'true',
    REVALIDATION_WAIT_UNTIL: process.env.REVALIDATION_WAIT_UNTIL || '1000000',
    DATA_CACHE_MAX_AGE: process.env.DATA_CACHE_MAX_AGE || '28800',
    FORCE_DYNAMIC_DATA: process.env.FORCE_DYNAMIC_DATA || 'false',
    SERVER_ACTIONS_ENABLED: 'true', // Ensure server actions are explicitly enabled
    ALLOW_CONCURRENT_REVALIDATION: process.env.ALLOW_CONCURRENT_REVALIDATION || 'true',
  },
  
  // Add webpack configuration for optimizing chunks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side chunk size
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        maxSize: 60000, // Limit chunk size to reduce unused JS chunks
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/](?!framer-motion)[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 30,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
    }
    return config;
  },
  
  // Handle redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/api/init',
        destination: '/api/revalidate?type=all',
        permanent: false,
      },
    ];
  },
  
  // Add headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;