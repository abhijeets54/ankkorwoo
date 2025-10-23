# Stock Badge Implementation - Live WooCommerce Data

## Overview

The stock badge system displays real-time stock status directly from WooCommerce, ensuring accurate availability information for customers.

---

## 🎯 Features

- ✅ **Live WooCommerce Data**: Fetches stock status directly from WooCommerce API
- ✅ **Real-time Updates**: Uses stock update manager for live inventory changes
- ✅ **Multiple States**: In Stock, Out of Stock, Low Stock, On Backorder
- ✅ **Smart Thresholds**: Configurable low stock warnings (default: 5 items)
- ✅ **Accessible**: ARIA labels and semantic HTML
- ✅ **Responsive**: Works on all device sizes

---

## 📊 Stock Status Mapping

### WooCommerce Stock Status Values

Based on WooCommerce official documentation:
https://woocommerce.github.io/code-reference/classes/WC-Product.html#method_get_stock_status

| WooCommerce Status | Display Badge | Color | Icon |
|-------------------|---------------|-------|------|
| `IN_STOCK` or `instock` | ✓ In Stock | Green | CheckCircle |
| `OUT_OF_STOCK` or `outofstock` | ✗ Out of Stock | Red | XCircle |
| `ON_BACKORDER` or `onbackorder` | ⏳ On Backorder | Blue | Clock |
| Low Stock (quantity ≤ 5) | ⚠️ Only X left | Orange | AlertTriangle |

---

## 🔧 Component API

### StockBadge Component

```tsx
import StockBadge from '@/components/product/StockBadge';

<StockBadge
  stockStatus="IN_STOCK"       // Required: WooCommerce stock status
  stockQuantity={10}            // Optional: Current stock quantity
  variant="default"             // Optional: 'compact' | 'default' | 'detailed'
  showIcon={true}               // Optional: Show status icon
  lowStockThreshold={5}         // Optional: Low stock warning threshold
  className=""                  // Optional: Additional CSS classes
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stockStatus` | `string` | Required | WooCommerce stock status value |
| `stockQuantity` | `number` | `undefined` | Current stock quantity (for low stock detection) |
| `variant` | `'compact' \| 'default' \| 'detailed'` | `'default'` | Badge size variant |
| `showIcon` | `boolean` | `true` | Whether to show icon |
| `lowStockThreshold` | `number` | `5` | Quantity threshold for low stock warning |
| `className` | `string` | `''` | Additional CSS classes |

---

## 📍 Where Stock Badges Appear

### 1. Product Cards (Homepage, Collections, Category Pages)

```tsx
// src/components/product/ProductCard.tsx
<StockBadge
  stockStatus={currentStockStatus || stockStatus}
  stockQuantity={currentStockQuantity}
  variant="compact"
  showIcon={true}
  lowStockThreshold={5}
/>
```

- **Location**: Below product price, next to sale badge
- **Variant**: Compact (smaller size)
- **Data Source**: Real-time stock from `useSimpleStockUpdates` hook

### 2. Product Detail Page

```tsx
// src/components/product/ProductDetail.tsx
<StockBadge
  stockStatus={currentStockStatus || stockStatus}
  stockQuantity={currentStockQuantity}
  variant="default"
  showIcon={true}
  lowStockThreshold={5}
/>
```

- **Location**: Below product price
- **Variant**: Default (medium size)
- **Data Source**: Real-time stock from `useSimpleStockUpdates` hook

---

## 🔄 Data Flow

### 1. Initial Data from WooCommerce GraphQL

```typescript
// GraphQL Query includes stock fields
const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    ... on SimpleProduct {
      stockStatus
      stockQuantity
    }
    ... on VariableProduct {
      stockStatus
      stockQuantity
      variations {
        nodes {
          stockStatus
          stockQuantity
        }
      }
    }
  }
`;
```

### 2. Real-time Updates via Stock Manager

```typescript
// useSimpleStockUpdates hook
const stockData = useSimpleStockUpdates(productId, {
  stockStatus: initialStockStatus,
  stockQuantity: initialStockQuantity,
  availableForSale: stockStatus === 'IN_STOCK'
});

// Returns live data:
// - stockData.stockStatus
// - stockData.stockQuantity
// - stockData.lastUpdated
```

### 3. Badge Display

```typescript
// Component uses live data
const currentStockStatus = stockData.stockStatus || initialStockStatus;
const currentStockQuantity = stockData.stockQuantity || initialStockQuantity;

<StockBadge
  stockStatus={currentStockStatus}
  stockQuantity={currentStockQuantity}
/>
```

---

## 🎨 Visual Examples

### In Stock (Green)
```
┌─────────────────────┐
│ ✓ In Stock         │  Green background
└─────────────────────┘
```

### Low Stock (Orange)
```
┌─────────────────────┐
│ ⚠️ Only 3 left      │  Orange background
└─────────────────────┘
```

### Out of Stock (Red)
```
┌─────────────────────┐
│ ✗ Out of Stock     │  Red background
└─────────────────────┘
```

### On Backorder (Blue)
```
┌─────────────────────┐
│ ⏳ On Backorder    │  Blue background
└─────────────────────┘
```

---

## 🔧 Configuration

### Adjusting Low Stock Threshold

Change the warning threshold for low stock:

```tsx
// Default: Shows "Only X left" when quantity ≤ 5
<StockBadge lowStockThreshold={5} />

// Custom: Show warning when quantity ≤ 10
<StockBadge lowStockThreshold={10} />
```

### Variant Sizes

```tsx
// Compact - Product cards, small spaces
<StockBadge variant="compact" />  // text-xs, smaller padding

// Default - Product detail pages
<StockBadge variant="default" />  // text-xs, standard padding

// Detailed - Emphasis areas
<StockBadge variant="detailed" /> // text-sm, larger padding
```

---

## 🧪 Testing

### Test Cases

1. **In Stock Product**
   - Set product stock quantity > 5
   - Expected: Green "✓ In Stock" badge

2. **Low Stock Product**
   - Set product stock quantity ≤ 5
   - Expected: Orange "⚠️ Only X left" badge

3. **Out of Stock Product**
   - Set product stock status to "Out of stock"
   - OR set stock quantity to 0
   - Expected: Red "✗ Out of Stock" badge

4. **Backorder Product**
   - Set product stock status to "On backorder"
   - Expected: Blue "⏳ On Backorder" badge

### WooCommerce Setup

1. **Edit Product** in WordPress Admin
2. **Product data** → **Inventory** tab
3. Set:
   - ☑ Manage stock
   - Stock quantity: (enter number)
   - Stock status: In stock / Out of stock / On backorder

---

## 🔗 Related Files

### Components
- `src/components/product/StockBadge.tsx` - Main stock badge component
- `src/components/product/ProductCard.tsx` - Product card with stock badge
- `src/components/product/ProductDetail.tsx` - Product detail with stock badge

### Hooks
- `src/hooks/useSimpleStockUpdates.ts` - Real-time stock updates hook

### Services
- `src/lib/stockUpdateManager.ts` - Stock update event management
- `src/lib/woocommerce.ts` - WooCommerce GraphQL queries

---

## 📚 WooCommerce Documentation References

- **Stock Management**: https://woocommerce.com/document/managing-products/#stock-management
- **Stock Status API**: https://woocommerce.github.io/code-reference/classes/WC-Product.html#method_get_stock_status
- **GraphQL Schema**: https://github.com/wp-graphql/wp-graphql-woocommerce

---

## 🚀 Future Enhancements

Potential improvements:

1. **Stock Reservation Indicators**: Show when items are reserved in carts
2. **Arrival Notifications**: Notify when back in stock
3. **Stock History**: Show stock level trends
4. **Multi-location Stock**: Display stock across warehouses
5. **Pre-order Support**: Handle pre-order products

---

## 🐛 Troubleshooting

### Badge Not Showing

1. **Check WooCommerce Setup**:
   - Product → Inventory → "Manage stock" is enabled
   - Stock quantity is set

2. **Check GraphQL Response**:
   - Visit: `https://your-site.com/graphql`
   - Query product and check `stockStatus` and `stockQuantity` fields

3. **Check Browser Console**:
   - Look for errors
   - Check if stock data is being fetched

### Wrong Stock Status

1. **Verify WooCommerce Stock Settings**:
   - Product → Inventory → Check stock status dropdown
   - Ensure "Stock quantity" matches actual inventory

2. **Check for Caching**:
   - Clear WooCommerce transients
   - Clear browser cache

3. **Test Real-time Updates**:
   - Update stock in WooCommerce admin
   - Refresh product page
   - Stock badge should update

---

## ✅ Summary

The stock badge system provides:
- ✅ Accurate, live stock information from WooCommerce
- ✅ Clear visual indicators for customers
- ✅ Smart low stock warnings
- ✅ Accessible and responsive design
- ✅ Easy to customize and extend

All stock data comes directly from WooCommerce - no hardcoded values!
