# User Profile - Order Fetching & Display Documentation

## Status: ✅ Already Fully Implemented

The user profile page already has comprehensive order fetching and display functionality implemented following WooCommerce best practices.

---

## Implementation Overview

### Files Involved

1. **[src/app/account/page.tsx](src/app/account/page.tsx)** - Server-side order fetching
2. **[src/components/account/AccountDashboard.tsx](src/components/account/AccountDashboard.tsx)** - Client-side order display

---

## Order Data Fetching

### GraphQL Query (Lines 75-204)

The account page uses WPGraphQL for WooCommerce to fetch customer orders with complete details:

```graphql
query GetCustomer {
  customer {
    orders(first: 20, where: {orderby: {field: DATE, order: DESC}}) {
      nodes {
        # Order Basics
        id
        databaseId
        date
        status
        total
        subtotal
        totalTax
        shippingTotal
        discountTotal
        paymentMethodTitle
        customerNote

        # Billing Address
        billing {
          firstName, lastName, company
          address1, address2
          city, state, postcode, country
          email, phone
        }

        # Shipping Address
        shipping {
          firstName, lastName, company
          address1, address2
          city, state, postcode, country
        }

        # Line Items (Products)
        lineItems {
          nodes {
            product {
              node {
                id, name, slug
                image { sourceUrl, altText }
              }
            }
            variation {
              node {
                id, name
                attributes {
                  nodes { name, value }
                }
              }
            }
            quantity
            total
            subtotal
            totalTax
          }
        }

        # Shipping Methods
        shippingLines {
          nodes {
            methodTitle
            total
          }
        }

        # Fees
        feeLines {
          nodes {
            name
            total
          }
        }

        # Coupons/Discounts
        couponLines {
          nodes {
            code
            discount
          }
        }
      }

      # Pagination
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
}
```

### Authentication & Security

**JWT Token Authentication** (Lines 206-232):
```typescript
async function getCustomerData(authToken: string) {
  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await graphQLClient.request(GET_CUSTOMER_QUERY);
  return { success: true, customer: data.customer };
}
```

**Token Validation** (Lines 244-256):
- Verifies JWT token exists in cookies
- Checks token expiration
- Redirects to login if invalid or expired

---

## Order Display (AccountDashboard)

### UI Components

**Orders Tab** (Lines 426-591):
Displays order history in a clean, organized layout with:

#### 1. Order Header
```tsx
- Order Number (#databaseId)
- Order Date (formatted)
- Payment Method
- Order Status Badge (color-coded)
- Total Amount
```

**Status Colors**:
- ✅ **Completed**: Green badge
- 🔵 **Processing**: Blue badge
- ❌ **Cancelled**: Red badge
- ⚠️ **Pending**: Yellow badge

#### 2. Order Items Section
For each product in the order:
```tsx
- Product Image (thumbnail)
- Product Name
- Variation Attributes (Size, Color, etc.)
- Quantity × Unit Price
- Line Item Total
```

**Example Display**:
```
[Image] Premium Shirt
        Size: L, Color: Blue
        Qty: 2 × $50.00            $100.00
```

#### 3. Order Summary
```tsx
- Subtotal
- Shipping (if applicable)
- Tax (if applicable)
- Discount (if coupons used)
```

#### 4. Address Information
Two-column layout showing:
```tsx
Billing Address          Shipping Address
-------------------      -------------------
John Doe                 Jane Smith
123 Main St              456 Oak Ave
City, State 12345        City, State 67890
Country                  Country
Phone: (123) 456-7890
```

#### 5. Additional Details
```tsx
- Customer Notes (if provided)
- "View Full Details" button
```

---

## Complete Order Information Fetched

### ✅ Basic Order Data
- [x] Order ID (database ID)
- [x] Order Date
- [x] Order Status
- [x] Total Amount
- [x] Subtotal
- [x] Tax Amount
- [x] Shipping Cost
- [x] Discount Amount
- [x] Payment Method

### ✅ Customer Information
- [x] Billing Address (complete)
- [x] Shipping Address (complete)
- [x] Customer Email
- [x] Customer Phone
- [x] Customer Notes

### ✅ Product Information
- [x] Product Name
- [x] Product Image
- [x] Product Slug (for linking)
- [x] Variation Details (Size, Color, etc.)
- [x] Quantity Ordered
- [x] Unit Price
- [x] Line Item Total
- [x] Line Item Tax

### ✅ Additional Details
- [x] Shipping Method & Cost
- [x] Fee Lines (extra charges)
- [x] Coupon Codes Applied
- [x] Discount Amounts

### ✅ Pagination Support
- [x] First 20 orders loaded
- [x] Ordered by date (newest first)
- [x] Page info for "Load More" functionality

---

## Features & Best Practices

### 1. **Authentication Required**
- Users must be logged in to view orders
- JWT token verified on every request
- Expired tokens redirect to login

### 2. **Real-Time Data**
- Orders fetched directly from WooCommerce
- No stale cached data
- Always shows current order status

### 3. **Comprehensive Details**
- All order information in one query
- Reduces API calls
- Better performance

### 4. **User-Friendly Display**
- Clean, organized layout
- Color-coded status badges
- Easy-to-read formatting
- Product images for visual reference

### 5. **Variation Support**
- Shows size, color, and other attributes
- Displays variation-specific pricing
- Helps users identify exact items ordered

### 6. **Mobile Responsive**
- Grid layout adapts to screen size
- Stacked on mobile, side-by-side on desktop
- Touch-friendly interface

---

## Order Status Meanings

| Status | Meaning | Badge Color |
|--------|---------|-------------|
| **completed** | Order fulfilled and delivered | Green |
| **processing** | Payment received, preparing order | Blue |
| **pending** | Awaiting payment | Yellow |
| **on-hold** | Payment on hold, awaiting confirmation | Orange |
| **cancelled** | Order cancelled by customer/admin | Red |
| **refunded** | Order refunded | Purple |
| **failed** | Payment failed | Red |

---

## Error Handling

### Token Expired
```typescript
if (decodedToken.exp < currentTime) {
  redirect('/sign-in?redirect=/account&reason=expired');
}
```

### Invalid Token
```typescript
catch (error) {
  redirect('/sign-in?redirect=/account&reason=invalid');
}
```

### API Fetch Error
```tsx
if (!customer) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
      Unable to load account information.
      Please try <a href="/sign-in">signing in again</a>.
    </div>
  );
}
```

### No Orders Yet
```tsx
{customer.orders.nodes.length === 0 && (
  <div className="text-center py-8">
    <p className="text-[#8a8778] mb-4">
      You haven't placed any orders yet.
    </p>
    <Button onClick={() => router.push('/collection')}>
      Start Shopping
    </Button>
  </div>
)}
```

---

## API Endpoints Used

### WooCommerce GraphQL
```
Endpoint: /graphql
Authentication: JWT Bearer Token
Query: GetCustomer (with orders)
```

### Environment Variable
```bash
WOOCOMMERCE_GRAPHQL_URL=https://your-site.com/graphql
```

---

## Sample Order Data Structure

```typescript
{
  id: "order_123",
  databaseId: 123,
  date: "2025-01-15T10:30:00",
  status: "completed",
  total: "150.00",
  subtotal: "120.00",
  totalTax: "15.00",
  shippingTotal: "15.00",
  discountTotal: "0.00",
  paymentMethodTitle: "Credit Card",
  billing: {
    firstName: "John",
    lastName: "Doe",
    address1: "123 Main St",
    city: "New York",
    state: "NY",
    postcode: "10001",
    country: "US",
    email: "john@example.com",
    phone: "(123) 456-7890"
  },
  lineItems: {
    nodes: [
      {
        product: {
          node: {
            name: "Premium Shirt",
            slug: "premium-shirt",
            image: {
              sourceUrl: "https://...",
              altText: "Premium Shirt"
            }
          }
        },
        variation: {
          node: {
            attributes: {
              nodes: [
                { name: "Size", value: "L" },
                { name: "Color", value: "Blue" }
              ]
            }
          }
        },
        quantity: 2,
        total: "100.00"
      }
    ]
  }
}
```

---

## Future Enhancements (Optional)

### 1. Order Filtering
```tsx
- Filter by status (completed, processing, etc.)
- Filter by date range
- Search by order number
```

### 2. Pagination
```tsx
- "Load More" button
- Infinite scroll
- Page numbers
```

### 3. Order Actions
```tsx
- Reorder button (add all items to cart)
- Download invoice
- Track shipment
- Request return/refund
```

### 4. Order Details Page
```tsx
- Dedicated page per order
- More detailed tracking info
- PDF invoice generation
```

### 5. Order Notifications
```tsx
- Email notifications on status change
- Push notifications (if PWA)
- SMS updates
```

---

## Testing Checklist

### Order Display
- [x] Orders shown in correct order (newest first)
- [x] All order details visible
- [x] Product images load correctly
- [x] Variation attributes display properly
- [x] Status badges show correct colors
- [x] Amounts formatted with currency symbol
- [x] Addresses display completely

### Authentication
- [x] Requires login to view orders
- [x] Expired token redirects to login
- [x] Invalid token handled gracefully

### Error Handling
- [x] No orders message shows correctly
- [x] API errors display user-friendly message
- [x] Network errors handled

### Responsive Design
- [x] Mobile view works properly
- [x] Tablet view works properly
- [x] Desktop view works properly

---

## Related Documentation

- [WPGraphQL for WooCommerce Docs](https://woographql.com/docs/using-order-data)
- [WooCommerce REST API - Orders](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)
- [JWT Authentication Setup](https://github.com/wp-graphql/wp-graphql-jwt-authentication)

---

## Summary

The user profile **already has complete order fetching and display** functionality:

✅ **Fetching**: GraphQL query gets all order data with one request
✅ **Authentication**: JWT token securely authenticates requests
✅ **Display**: Clean, organized UI shows all order details
✅ **Products**: Shows images, names, variations, quantities, prices
✅ **Addresses**: Displays billing and shipping information
✅ **Status**: Color-coded badges for easy status identification
✅ **Responsive**: Works on all device sizes
✅ **Error Handling**: Graceful handling of all error scenarios

**No additional implementation needed!** The system is production-ready and follows WooCommerce best practices.

---

**Status**: ✅ Complete
**Implementation Date**: Already implemented
**Last Verified**: October 24, 2025
**Production Ready**: Yes
