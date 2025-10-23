# WooCommerce Size Selection Setup Guide

## Overview
This guide explains how to set up size variations in WooCommerce to work with the Ankkor size selection system.

## Step 1: Create Product Attributes

1. **Go to WooCommerce Admin** → Products → Attributes
2. **Add New Attribute**:
   - Name: `Size`
   - Slug: `size` (auto-generated)
   - Enable Archives: ✓ (optional)
   - Default sort order: Custom ordering
3. **Configure Terms** (Click "Configure terms"):
   - Add terms: `S`, `M`, `L`, `XL`, `XXL`
   - Each term gets a slug automatically

## Step 2: Create Variable Product

1. **Add New Product** in WooCommerce
2. **Product Data** → Select "Variable product"
3. **Attributes Tab**:
   - Add attribute: Select "Size" from dropdown
   - Check "Used for variations"
   - Check "Visible on the product page"
   - Select values: Choose the sizes you want (S, M, L, XL)
   - Save attributes

## Step 3: Create Variations

1. **Variations Tab**:
   - Click "Create variations from all attributes"
   - Or manually add variations
2. **For each variation**:
   - Set regular price
   - Set sale price (optional)
   - Manage stock: Enable if needed
   - Stock quantity: Set available quantity
   - Stock status: In stock/Out of stock

## Step 4: GraphQL Query Structure

The system expects this GraphQL structure:

```graphql
{
  product(id: "product-slug", idType: SLUG) {
    id
    databaseId
    name
    type
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
}
```

## Step 5: Test Your Setup

1. Visit `/debug-sizes` to see if products have size data
2. Visit `/test-size-selector` to test the size selector component
3. Check browser console for debug logs

## Common Issues

### No Size Selector Showing
- Check if product type is "VARIABLE"
- Verify attribute name is exactly "Size" (case-sensitive)
- Ensure variations are created and published

### Sizes Show as Unavailable
- Check variation stock status
- Verify stock quantities are set
- Ensure variations are published

### GraphQL Issues
- Verify WooGraphQL plugin is active
- Check GraphQL endpoint is accessible
- Ensure proper authentication if required

## Supported Attribute Names

The system looks for these attribute names:
- `size`
- `Size`
- `SIZE`
- `pa_size`
- `pa_Size`
- `pa_SIZE`
- `product_size`
- `Product Size`
- `sizes`
- `Sizes`
- `SIZES`

## Example Product Structure

```json
{
  "name": "Premium T-Shirt",
  "type": "VARIABLE",
  "attributes": {
    "nodes": [
      {
        "name": "Size",
        "options": ["S", "M", "L", "XL"]
      }
    ]
  },
  "variations": {
    "nodes": [
      {
        "id": "variation-1",
        "price": "25.00",
        "stockStatus": "IN_STOCK",
        "stockQuantity": 10,
        "attributes": {
          "nodes": [
            {
              "name": "Size",
              "value": "S"
            }
          ]
        }
      }
    ]
  }
}
```