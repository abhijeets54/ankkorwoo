# Troubleshooting: Why Size Selectors Are Not Showing

## Quick Diagnosis

### Step 1: Run the Debug Script

```bash
cd ankkor
npm run debug:products
```

This will analyze your products and tell you exactly what's wrong.

---

## Most Common Issues (99% of cases)

### Issue #1: Products Are "Simple" Not "Variable" ❌

**Symptom**: No size selector appears anywhere

**Check**:
- Go to WordPress Admin → Products → Edit any product
- Look at "Product data" dropdown at top
- If it says "Simple product" → **This is your problem**

**Fix**:
1. Change dropdown to "Variable product"
2. Click "Attributes" tab
3. Add "Size" attribute
4. Check "Used for variations" ✓
5. Click "Variations" tab
6. Select "Create variations from all attributes" → Go
7. Set price and stock for each size variation
8. Click "Update"

---

### Issue #2: No Size Attribute Added ❌

**Symptom**: Product is Variable but no sizes show

**Check**:
- Edit product → Attributes tab
- Is there a "Size" attribute? NO → **This is your problem**

**Fix**:
1. In Attributes tab, click "Add"
2. Select "Size" from dropdown (or "Custom product attribute")
3. If custom: Name it exactly "Size"
4. Add values: `S | M | L | XL` (separated by |)
5. Check "Used for variations" ✓
6. Check "Visible on the product page" ✓
7. Click "Save attributes"
8. Go to Variations tab
9. Create variations (see Issue #1)

---

### Issue #3: Variations Not Created ❌

**Symptom**: Size attribute exists but selector doesn't appear

**Check**:
- Edit product → Variations tab
- Are there variations listed? NO → **This is your problem**

**Fix**:
1. Go to Variations tab
2. From dropdown: "Create variations from all attributes"
3. Click "Go"
4. Confirm popup
5. Wait for variations to be created
6. Expand each variation and set:
   - Regular price
   - Stock quantity
   - Stock status: In stock
7. Click "Save changes"

---

### Issue #4: Variations Missing Pricing ❌

**Symptom**: Size selector appears but prices are wrong/missing

**Check**:
- Edit product → Variations tab
- Expand each variation
- Is "Regular price" empty? YES → **This is your problem**

**Fix**:
1. For EACH variation:
   - Expand it
   - Set "Regular price": e.g., `1522`
   - Set "Sale price" (optional): e.g., `1299`
   - Stock quantity: e.g., `10`
2. Click "Save changes"

---

## Verification Steps

### 1. Check Browser Console

Open your site → Press F12 → Go to Console tab

You should see logs like:
```
ProductCard: Processing product for sizes: Elegant Lilac
ProductCard: Extracted size info: {hasSizes: true, availableSizes: [...]}
```

If you see:
```
Product is not variable or has no attributes
```
→ Your product is not set up correctly

### 2. Check Network Tab

F12 → Network tab → Reload page → Find GraphQL request

Look at the response for your product:
```json
{
  "name": "Elegant Lilac",
  "type": "VARIABLE",  ← Must be VARIABLE
  "attributes": {
    "nodes": [
      {
        "name": "Size",  ← Must have Size attribute
        "options": ["S", "M", "L", "XL"]
      }
    ]
  },
  "variations": {  ← Must have variations
    "nodes": [...]
  }
}
```

### 3. Test with GraphiQL

1. Go to: `https://maroon-lapwing-781450.hostingersite.com/graphql`
2. Paste this query:

```graphql
{
  products(first: 5) {
    nodes {
      name
      type
      ... on VariableProduct {
        attributes {
          nodes {
            name
            options
          }
        }
        variations(first: 3) {
          nodes {
            name
            price
            stockStatus
          }
        }
      }
    }
  }
}
```

3. Click play button
4. Check if your products:
   - Have `type: "VARIABLE"`
   - Have size attributes
   - Have variations with prices

---

## Expected Product Structure

For size selectors to work, WooCommerce must return:

```javascript
{
  id: "gid://woocommerce/Product/123",
  name: "Elegant Lilac",
  type: "VARIABLE",  // ← MUST BE VARIABLE

  attributes: {
    nodes: [
      {
        name: "Size",  // ← MUST HAVE SIZE ATTRIBUTE
        options: ["S", "M", "L", "XL"]
      }
    ]
  },

  variations: {  // ← MUST HAVE VARIATIONS
    nodes: [
      {
        id: "gid://woocommerce/ProductVariation/456",
        name: "Elegant Lilac - S",
        price: "1522",
        stockStatus: "IN_STOCK",
        stockQuantity: 10,
        attributes: {
          nodes: [
            { name: "Size", value: "S" }
          ]
        }
      },
      // ... more variations
    ]
  }
}
```

---

## Still Not Working?

### Run All Diagnostics:

```bash
# 1. Check product data from WooCommerce
npm run debug:products

# 2. Clear Next.js cache
rm -rf .next
npm run dev

# 3. Clear browser cache
# Chrome: Ctrl+Shift+Delete → Clear browsing data

# 4. Test in incognito mode
```

### Check Console Logs:

When you visit a product page, you should see:

```
✅ Processing product for sizes: [Product Name]
✅ Found size attribute: Size
✅ Processing variations: 4
✅ Size variations processed: 4
✅ Created size attribute: {value: "S", isAvailable: true, ...}
```

If you see:
```
❌ Product is not variable or has no attributes
❌ No size attribute found
```
→ Go back to WooCommerce and fix product setup

---

## Manual Test Checklist

- [ ] Product type is "Variable product" in WooCommerce
- [ ] Size attribute is added to product
- [ ] "Used for variations" is checked
- [ ] Variations are created (visible in Variations tab)
- [ ] Each variation has a price
- [ ] Each variation has stock quantity
- [ ] Product is published (not draft)
- [ ] Browser cache is cleared
- [ ] You're testing on the correct environment (dev/production)

---

## Example Video Tutorial

**Setting Up Variable Products in WooCommerce:**
1. Search YouTube: "WooCommerce variable product tutorial"
2. Follow any recent video (2023+)
3. Focus on: Attributes → Variations → Pricing

---

## Contact Support

If still having issues after checking everything above, provide:

1. **Output from debug script**:
   ```bash
   npm run debug:products > debug-output.txt
   ```

2. **Screenshots of**:
   - Product edit page (Product data section)
   - Attributes tab
   - Variations tab

3. **Browser console logs**:
   - Open console → Copy all logs
   - Include any error messages

4. **GraphQL response**:
   - Use GraphiQL to query your product
   - Copy the full JSON response

This will help diagnose the exact issue!
