# Ankkor: Next.js 14 with Headless WooCommerce

A modern e-commerce frontend built with Next.js 14 App Router and headless WooCommerce backend.

## Features

- **Modern Tech Stack**: Next.js 14, React Server Components, TypeScript
- **Headless CMS**: WooCommerce with WPGraphQL/WooGraphQL
- **State Management**: Zustand for client-side state
- **UI/Styling**: TailwindCSS, shadcn/ui components, Framer Motion animations
- **Performance**: Optimized for Core Web Vitals, WCAG 2.1 AA compliant
- **Data Sync**: Redis for inventory mapping/caching, QStash for scheduled data synchronization

## Architecture

The project uses a headless architecture:

- **Frontend**: Next.js 14 with App Router
- **Backend**: WordPress with WooCommerce
- **API Layer**: WPGraphQL with WooGraphQL extension
- **Data Flow**: GraphQL API communication with server-side rendering and client components

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- WordPress installation with WooCommerce
- Required WordPress plugins:
  - WooCommerce
  - WPGraphQL
  - WooGraphQL (WPGraphQL for WooCommerce)
  - WPGraphQL-JWT-Authentication
  - WP Headless (recommended for disabling the WordPress frontend)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ankkor.git
cd ankkor
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp env.woocommerce.example .env.local
```

Edit `.env.local` with your WooCommerce credentials.

4. Run the development server:
```bash
npm run dev
```

## WooCommerce Setup

For detailed WordPress/WooCommerce setup instructions, see [WooCommerce Setup Guide](docs/woocommerce-setup.md).

## Deployment

The project can be deployed to Vercel:

```bash
npm run build
```

Set up the following environment variables in your Vercel project:

- `NEXT_PUBLIC_WORDPRESS_URL`
- `WOOCOMMERCE_GRAPHQL_URL`
- `WOOCOMMERCE_CONSUMER_KEY`
- `WOOCOMMERCE_CONSUMER_SECRET`
- `WOOCOMMERCE_JWT_SECRET`
- `WOOCOMMERCE_REVALIDATION_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`
- `NEXT_PUBLIC_COMMERCE_PROVIDER=woocommerce`

## Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application
- `npm run setup-woo-sync`: Configure data synchronization
- `npm run validate-woo-migration`: Run validation tests
- `npm run migrate-mapping`: Execute product mapping between systems

## Documentation

- [WooCommerce Setup Guide](docs/woocommerce-setup.md)
- [WooCommerce Migration Summary](docs/woocommerce-migration-summary.md)
- [Inventory Management](docs/inventory-management.md)
- [Redis Implementation](docs/redis-implementation.md)

## License

[MIT](LICENSE)
