# Size Selector Not Showing on Product Cards - Troubleshooting Guide

## Issue
Size selectors appear on **Product Detail Pages** but NOT on **Product Cards** (homepage, collections, category pages).

---

## Root Cause Analysis

### What We Know:

✅ **WooCommerce Products Are Configured Correctly**
- Products are `VARIABLE` type
- Products have `pa_size` attribute with values: s, m, l, xl
- Products have 4 variations with prices and stock

✅ **Size Selector Code Is Working**
- Shows correctly on Product Detail page
- `SizeAttributeProcessor` recognizes `pa_size`
- `ProductCard` component has size selector UI

❌ **Product Data Missing Attributes/Variations**
- `product._originalWooProduct` is passed to ProductCard
- BUT it likely doesn't include `attributes` and `variations` fields

---

## Debugging Steps

### 1. Check Browser Console

Open your site in browser → Press F12 → Console tab

Look for these logs from ProductCard:
```
ProductCard: Processing product for sizes: TIMELESS GREEN
ProductCard: Product data: {
  type: "VARIABLE",
  hasAttributes: false,     // ❌ Should be true
  attributesCount: 0,        // ❌ Should be > 0
  attributes: [],            // ❌ Should show ["pa_size"]
  hasVariations: false,      // ❌ Should be true
  variationsCount: 0        // ❌ Should be 4
}
```

**If you see `hasAttributes: false` or `attributesCount: 0`:**
→ The GraphQL query is NOT fetching attributes/variations

---

## Solution

### The GraphQL Query Needs to Include Attributes & Variations

Find where products are fetched for homepage/collections and ensure the query includes:

```graphql
query GetProducts {
  products(first: 20) {
    nodes {
      id
      name
      type
      # ... other fields ...

      # ADD THESE FOR VARIABLE PRODUCTS:
      ... on VariableProduct {
        attributes {
          nodes {
            name
            options
          }
        }
        variations {
          nodes {
            id
            databaseId
            price
            stockStatus
            stockQuantity
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Files to Check

### 1. Homepage Product Fetching
**File**: `src/app/page.tsx` (around line 216)

Currently passes: `product={originalProduct}`

**Check**: Where does `originalProduct` come from?
- Look for `_originalWooProduct`
- Trace back to the data fetching function

### 2. Collection Page Product Fetching
**File**: `src/app/collection/page.tsx` (around line 448)

Same issue - check the data source.

### 3. GraphQL Queries
**File**: `src/lib/woocommerce.ts`

Find these queries:
- `GET_PRODUCTS` (line 238)
- `QUERY_ALL_PRODUCTS`
- Any query used for homepage/collection pages

**Verify they include**:
```graphql
... on VariableProduct {
  ...VariableProductWithVariations
}
```

---

## Quick Fix Guide

### Step 1: Find the Query

Search for where products are fetched:

```bash
cd ankkor
grep -r "getAllProducts\|getFeaturedProducts\|getProducts" src/app/page.tsx src/app/collection/
```

### Step 2: Check the GraphQL Query

Find the GraphQL query being used (in `woocommerce.ts`):

```typescript
const GET_PRODUCTS = gql`
  query GetProducts(...) {
    products(...) {
      nodes {
        ...ProductFields
        ... on VariableProduct {
          ...VariableProductWithVariations  // ← Must be here!
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
  ${VARIABLE_PRODUCT_FRAGMENT}  // ← Must be included!
`;
```

### Step 3: Verify Fragment Includes Variations

Check `VARIABLE_PRODUCT_FRAGMENT` includes:

```graphql
fragment VariableProductWithVariations on VariableProduct {
  attributes {
    nodes {
      name
      options
    }
  }
  variations {
    nodes {
      id
      databaseId
      name
      price
      regularPrice
      salePrice
      stockStatus
      stockQuantity
      attributes {
        nodes {
          name
          value
        }
      }
    }
  }
}
```

---

## Testing

### 1. After Fixing the Query

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Open homepage in browser**

3. **Check console** - Should now see:
   ```
   ProductCard: Product data: {
     type: "VARIABLE",
     hasAttributes: true,     // ✅
     attributesCount: 1,       // ✅
     attributes: ["pa_size"],  // ✅
     hasVariations: true,      // ✅
     variationsCount: 4        // ✅
   }
   ProductCard: Extracted size info: {
     hasSizes: true,           // ✅
     availableSizes: [...]     // ✅
   }
   ```

4. **Size selector should appear** below product cards!

---

## Expected Behavior After Fix

### Product Cards (Homepage, Collections, Categories):
```
┌─────────────────────────┐
│                         │
│   [Product Image]       │
│                         │
├─────────────────────────┤
│ TIMELESS GREEN          │
│ ₹1,522.00              │
│                         │
│ ✓ In Stock             │
│                         │
│ [S] [M] [L] [XL]       │ ← Size selector appears!
│                         │
│ [Add to Cart]          │
└─────────────────────────┘
```

### Product Detail Page:
Already working! Size selector shows with full details.

---

## Common Issues

### Issue 1: "Product is not variable or has no attributes"

**Console shows**:
```
ProductCard: Product is not variable or has no attributes
```

**Cause**: `product.type !== 'VARIABLE'` or `product.attributes?.nodes` is undefined

**Fix**: Ensure GraphQL query fetches both `type` and `attributes.nodes`

---

### Issue 2: "No size attribute found"

**Console shows**:
```
Found size attribute: undefined
```

**Cause**: Attribute name doesn't match expected patterns

**Current patterns**: `size`, `Size`, `pa_size`, `pa_Size`, `product_size`

**Fix**: Either:
1. Update WooCommerce to use one of these names, OR
2. Add your attribute name to `SIZE_ATTRIBUTE_NAMES` in `sizeAttributeProcessor.ts` (line 58)

---

### Issue 3: Size Selector Shows But Can't Add to Cart

**Error**: "Please select a size"

**Cause**: Size validation working correctly - this is expected!

**Solution**: User MUST select a size before adding to cart (for variable products)

---

## Console Debugging Commands

Open browser console and run:

```javascript
// Check if size selector prop is passed
document.querySelectorAll('[data-product-card]').forEach(el => {
  console.log(el.dataset);
});

// Check product data structure
console.log('Product data:', window.__PRODUCT_DATA__);
```

---

## Summary

**The fix**: Ensure GraphQL queries for homepage/collection pages include `attributes` and `variations` for variable products.

**Files to check**:
1. `src/lib/woocommerce.ts` - GraphQL queries
2. `src/app/page.tsx` - Homepage product fetching
3. `src/app/collection/page.tsx` - Collection product fetching

**Expected result**: Size selectors appear on all product cards, just like on product detail pages.

---

## Need Help?

1. **Run the debug script**:
   ```bash
   npm run debug:products
   ```

2. **Check browser console** with enhanced logging (already added)

3. **Verify query includes**: `...VariableProductWithVariations` fragment

4. **Test with one product** first, then apply to all

The size selector feature is fully implemented - it just needs the complete product data to work on cards!
