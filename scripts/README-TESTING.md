# 🧪 Ankkor Inventory System Test Suite

Comprehensive CLI testing suite for the Ankkor real-time inventory management system.

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:inventory
```

### Run Specific Test Categories
```bash
# Test stock validation APIs
npm run test:inventory:stock

# Test stock reservation system
npm run test:inventory:reservation

# Test webhook endpoints
npm run test:inventory:webhooks

# Test real-time updates (SSE)
npm run test:inventory:sse

# Test cleanup functionality
npm run test:inventory:cleanup

# Test system health
npm run test:inventory:health
```

## 🔧 Configuration

### Environment Variables
Set these before running tests:

```bash
# Required
export TEST_BASE_URL="https://ankkorwoo.vercel.app"
export CLEANUP_SECRET_TOKEN="your-cleanup-token"

# Optional
export TEST_PRODUCT_ID="57"  # Default product ID for testing
```

### Test Configuration
Edit `scripts/test-config.json` to customize:
- Test environments (local, staging, production)
- Test data (product IDs, user IDs)
- Expected responses
- Performance thresholds

## 📋 Test Categories

### 1. Stock Validation Tests
- ✅ Individual product stock check
- ✅ Bulk product validation
- ✅ Invalid product ID handling
- ✅ Variation stock verification

### 2. Stock Reservation Tests
- ✅ Create reservation
- ✅ Check reserved stock impact
- ✅ User reservations list
- ✅ Reservation expiry
- ✅ Release reservation
- ✅ Confirm reservation

### 3. Webhook Tests
- ✅ Inventory webhook GET/POST
- ✅ Order webhook GET/POST
- ✅ Webhook data processing
- ✅ Signature validation

### 4. Real-time Updates Tests
- ✅ SSE connection establishment
- ✅ Stock update broadcasting
- ✅ Connection resilience

### 5. Cleanup Tests
- ✅ Manual cleanup trigger
- ✅ Scheduled cleanup with auth
- ✅ Unauthorized access prevention
- ✅ Expired reservation cleanup

### 6. System Health Tests
- ✅ Basic connectivity
- ✅ Redis connectivity (indirect)
- ✅ API responsiveness

## 📊 Test Output

### Success Example
```
🚀 Starting Comprehensive Inventory System Tests
Testing against: https://ankkorwoo.vercel.app
Test Product ID: 57
Test User ID: test_user_1735598234567

============================================================
Testing Stock Validation Endpoints
============================================================
ℹ️  Testing individual product stock for product 57
✅ Stock API responded: {"available":true,"stockQuantity":10,"stockStatus":"instock"}
ℹ️  Testing bulk stock validation
✅ Bulk validation API responded: {"results":[{"productId":"57","available":true}]}

============================================================
Testing Stock Reservation System
============================================================
ℹ️  Creating stock reservation
✅ Reservation created: res_1735598234567_abc123def456
ℹ️  Expires at: 2025-07-30T22:15:34.567Z
ℹ️  Getting user reservations
✅ User has 1 reservations
ℹ️  Checking available stock after reservation
✅ Available stock: 9, Reserved: 1
ℹ️  Releasing reservation
✅ Reservation released successfully
```

### Error Example
```
❌ Stock API failed with status 500: {"error":"GraphQL query failed"}
⚠️  Expected 401 but got 500
```

## 🔍 Debugging

### Verbose Mode
Add debug logging by modifying the test script:
```javascript
const DEBUG = true; // Set to true for verbose output
```

### Individual Test Debugging
Run specific tests to isolate issues:
```bash
# Debug stock validation only
npm run test:inventory:stock

# Debug reservations only
npm run test:inventory:reservation
```

### Common Issues

#### GraphQL Errors
- Check WooCommerce GraphQL endpoint is accessible
- Verify product IDs exist in WooCommerce
- Ensure proper inline fragments in queries

#### Redis Connection Errors
- Verify UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- Check Redis instance is running
- Test Redis connectivity separately

#### Webhook Failures
- Verify webhook endpoints are deployed
- Check webhook secret configuration
- Test with sample data

## 📈 Performance Monitoring

The test suite includes performance monitoring:

### Response Time Thresholds
- API calls: < 2000ms
- Reservation creation: < 1000ms
- Stock validation: < 500ms

### Timeout Settings
- API requests: 10 seconds
- SSE connections: 5 seconds
- Webhook processing: 15 seconds

## 🔒 Security Testing

### Authentication Tests
- ✅ Cleanup endpoint authorization
- ✅ Webhook signature validation
- ✅ Unauthorized access prevention

### Token Validation
- Tests proper cleanup token usage
- Verifies webhook secret handling
- Checks for security vulnerabilities

## 📝 Test Reports

### Manual Report Generation
```bash
# Run tests and save output
npm run test:inventory > test-results.log 2>&1

# View results
cat test-results.log
```

### Automated CI/CD Integration
Add to your CI/CD pipeline:
```yaml
# GitHub Actions example
- name: Run Inventory Tests
  run: |
    export TEST_BASE_URL="https://ankkorwoo.vercel.app"
    export CLEANUP_SECRET_TOKEN="${{ secrets.CLEANUP_TOKEN }}"
    npm run test:inventory
```

## 🛠️ Extending Tests

### Adding New Test Categories
1. Add test function to `test-inventory-system.js`
2. Update CLI argument parsing
3. Add npm script to `package.json`
4. Update this README

### Custom Test Data
Modify `test-config.json`:
```json
{
  "testData": {
    "products": [
      {"id": "your-product-id", "name": "Your Product"}
    ]
  }
}
```

## 🎯 Best Practices

### Before Running Tests
1. Ensure test environment is stable
2. Verify all environment variables are set
3. Check that test products exist in WooCommerce
4. Confirm Redis is accessible

### During Development
1. Run specific test categories during development
2. Use health checks to verify system status
3. Monitor performance thresholds
4. Check for memory leaks in long-running tests

### After Changes
1. Run full test suite before deployment
2. Verify all tests pass in staging environment
3. Check performance hasn't degraded
4. Update test data if needed

## 📞 Support

If tests fail consistently:
1. Check system health first: `npm run test:inventory:health`
2. Verify environment configuration
3. Review error logs for specific issues
4. Test individual components separately
