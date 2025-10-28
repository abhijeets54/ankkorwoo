# AI Agent Instructions for Ankkor

This document provides essential guidance for AI agents working with the Ankkor codebase - a Next.js 14 e-commerce frontend with headless WooCommerce integration.

## Project Architecture

- **Frontend**: Next.js 14 App Router with React Server Components and TypeScript
- **Backend**: Headless WooCommerce/WordPress via WPGraphQL
- **State Management**: Zustand for client-side state
- **UI**: TailwindCSS + shadcn/ui + Framer Motion
- **Data Layer**: GraphQL with Redis caching

## Key Patterns and Conventions

### Product Data Handling
```typescript
// Products are normalized from WooCommerce to a consistent internal format
// See: src/app/collection/shirts/page.tsx for reference
interface Product {
  id: string;
  title: string;
  handle: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string; }
    maxVariantPrice: { amount: string; currencyCode: string; }
  };
  images: Array<{url: string, altText?: string}>;
  variants: any[];
  metafields: Record<string, any>;
}
```

### Component Architecture
1. Pages use client-side React (`'use client'`)
2. Data fetching happens in page-level useEffect
3. Product display uses shared components (e.g., `ProductCard`)
4. Error states and loading states are handled consistently

### State Management
- Cart state managed via Zustand
- Product quick view state uses custom hooks (e.g., `useQuickView`)
- Loading states tracked with `usePageLoading` hook

## Critical Workflows

### Development
```bash
# Start dev server with WooCommerce config
npm run dev:woo

# Test WooCommerce integration
npm run test-store-api
npm run test:inventory

# Debug product data
npm run debug:products
```

### Inventory Management
- Stock validation happens at cart and checkout
- Real-time inventory updates via Server-Sent Events (SSE)
- Redis caching for performance optimization

### Testing & Validation
- Use `test:inventory:*` scripts for inventory system testing
- Authentication flow testing via `test:full-auth`
- Webhook validation with `test-webhooks`

## Integration Points

1. **WooCommerce GraphQL API**
   - Product catalog
   - Cart operations
   - Order management
   - Customer authentication

2. **Redis Cache Layer**
   - Inventory mapping
   - Product data caching
   - Session management

3. **QStash Integration**
   - Scheduled data synchronization
   - Inventory updates
   - Product re-validation

## Common Gotchas

1. Always normalize WooCommerce product data before use
2. Handle both guest and authenticated cart states
3. Validate stock at multiple points (add-to-cart, checkout)
4. Consider currency formatting (uses `formatPrice` utility)
5. Check image availability in product cards

## Environment Setup
Required env vars (see env.woocommerce.example):
- `NEXT_PUBLIC_WORDPRESS_URL`
- `WOOCOMMERCE_GRAPHQL_URL`
- `WOOCOMMERCE_CONSUMER_KEY`
- `WOOCOMMERCE_CONSUMER_SECRET`
- `WOOCOMMERCE_JWT_SECRET`