# WooCommerce Size Selector Setup Guide

## Why Size Selectors Are Not Showing

Size selectors only appear for **Variable Products** with **Size Attributes**. If you're not seeing them, your products are likely configured as **Simple Products** or don't have size variations set up.

---

## Step-by-Step: Setting Up Sizes in WooCommerce

### 1. Create a Size Attribute (One-time setup)

1. Go to WordPress Admin → **Products** → **Attributes**
2. Click "Add New Attribute"
3. Fill in:
   - **Name**: `Size`
   - **Slug**: `size` (or `pa_size`)
4. Click "Add attribute"
5. Click "Configure terms" next to your new Size attribute
6. Add size values: `S`, `M`, `L`, `XL`, `XXL`, etc.

### 2. Create/Edit a Product as Variable Product

#### For a New Product:

1. Go to **Products** → **Add New**
2. Enter product name and details
3. In **Product data** dropdown, select **Variable product**
4. Go to **Attributes** tab
5. Click "Add" → Select "Size" from dropdown
6. Check "Used for variations" ✓
7. Check "Visible on the product page" ✓
8. Click "Select all" to add all size terms
9. Click "Save attributes"

#### For an Existing Product:

1. Edit the product
2. Change **Product data** type to **Variable product**
3. Follow steps 4-9 above

### 3. Create Variations for Each Size

1. Go to **Variations** tab
2. From the dropdown, select **Create variations from all attributes**
3. Click "Go"
4. Confirm: "This will create X variations..."
5. Wait for variations to be created

### 4. Set Pricing and Stock for Each Variation

For each variation created:

1. Expand the variation (click the arrow)
2. Set:
   - **Regular price**: e.g., `1522`
   - **Sale price** (optional): e.g., `1299`
   - **Stock quantity**: e.g., `10`
   - **Stock status**: "In stock"
3. **Important**: Upload an image for the variation (optional but recommended)
4. Click "Save changes"

### 5. Publish/Update the Product

Click **Update** or **Publish**

---

## Verification Checklist

Before expecting size selectors to appear, verify:

- [ ] Product type is **Variable product** (not Simple)
- [ ] Size attribute is added to product
- [ ] "Used for variations" is checked ✓
- [ ] Variations are created (not just attributes)
- [ ] Each variation has:
  - [ ] A price set
  - [ ] Stock quantity set
  - [ ] Stock status = "In stock"

---

## Debug: Check What Data WooCommerce is Returning

Run this command to see your product data structure:

```bash
cd ankkor
node scripts/debug-product-data.js
```

This will show:
- ✅ Which products are Variable vs Simple
- ✅ Which products have size attributes
- ✅ Which products have variations
- ✅ Stock status for each size
- ✅ What might be misconfigured

---

## Example: Properly Configured Variable Product

```
Product: Elegant Lilac Shirt
Type: VARIABLE
├── Attributes
│   └── Size: [S, M, L, XL]
└── Variations
    ├── Size S - ₹1,522 - In Stock (10 units)
    ├── Size M - ₹1,522 - In Stock (15 units)
    ├── Size L - ₹1,522 - In Stock (8 units)
    └── Size XL - ₹1,522 - Out of Stock (0 units)
```

---

## Common Mistakes

### ❌ Mistake 1: Product is Simple, Not Variable
**Problem**: Product data type is "Simple product"
**Solution**: Change to "Variable product" and create variations

### ❌ Mistake 2: Attribute Added But Variations Not Created
**Problem**: Size attribute exists but no variations generated
**Solution**: Go to Variations tab → "Create variations from all attributes"

### ❌ Mistake 3: Variations Have No Pricing
**Problem**: Variations exist but prices are empty
**Solution**: Set price for each variation individually

### ❌ Mistake 4: Wrong Attribute Name
**Problem**: Using "Sizes" or "Product Size" instead of "Size"
**Solution**: Our code looks for: `size`, `Size`, `pa_size`, `SIZE`

### ❌ Mistake 5: Not Using Variations Checkbox
**Problem**: Attribute added but "Used for variations" not checked
**Solution**: Edit attribute → Check "Used for variations" ✓

---

## Testing

After setup, test by:

1. **Clear browser cache** (important!)
2. Visit product detail page
3. Size selector should appear below price
4. Try selecting different sizes
5. Price should update if sizes have different prices
6. "Add to Cart" should require size selection

### Where Size Selectors Appear:

- ✅ Homepage (product cards)
- ✅ Collection pages (/collection)
- ✅ Category pages (/category/[slug])
- ✅ Shirts page (/collection/shirts)
- ✅ Product detail pages (/product/[slug])

---

## Still Not Working?

1. **Run debug script**:
   ```bash
   node scripts/debug-product-data.js
   ```

2. **Check browser console** (F12 → Console tab):
   - Look for errors
   - Check if product data is being logged

3. **Check product type in console**:
   - On product page, open console
   - Type: `window.productData` or look for console logs
   - Verify product type is "VARIABLE"

4. **Re-index WooCommerce**:
   - Go to WooCommerce → Status → Tools
   - Click "Recount terms"
   - Click "Clear transients"

5. **Test with WPGraphQL**:
   - Go to: `https://your-site.com/graphql`
   - Use GraphiQL to query products
   - Verify variations are returned

---

## Need Help?

If still having issues, provide:
1. Output from `node scripts/debug-product-data.js`
2. Screenshot of product edit page showing:
   - Product data type
   - Attributes tab
   - Variations tab
3. Browser console errors (if any)

---

## Quick Reference: GraphQL Query for Testing

```graphql
query TestProduct {
  product(id: "elegant-lilac", idType: SLUG) {
    name
    type
    ... on VariableProduct {
      attributes {
        nodes {
          name
          options
        }
      }
      variations(first: 10) {
        nodes {
          name
          price
          stockStatus
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
```

Test at: `https://maroon-lapwing-781450.hostingersite.com/graphql`
