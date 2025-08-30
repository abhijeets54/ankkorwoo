# Phase 1 Production Readiness Test Suite

This comprehensive test suite validates all Phase 1 production improvements:

## 🎯 What's Tested

### 1. Database Persistence
- ✅ Cart creation and persistence across sessions
- ✅ Cart item management with atomic operations
- ✅ Cross-device cart synchronization
- ✅ Guest cart merging with user accounts
- ✅ Database transaction integrity

### 2. Webhook Security
- ✅ Signature verification (multiple formats)
- ✅ Rate limiting protection
- ✅ Timestamp validation (replay attack prevention)
- ✅ Malformed payload handling

### 3. Race Condition Protection
- ✅ Concurrent cart operations
- ✅ Stock reservation conflicts
- ✅ Distributed locking mechanisms
- ✅ Atomic database operations

### 4. Error Handling
- ✅ Input validation and sanitization
- ✅ Structured error responses
- ✅ Circuit breaker functionality
- ✅ Graceful degradation
- ✅ Retry mechanisms

### 5. Performance & Load Testing
- ✅ Response time under load
- ✅ Concurrent user simulation
- ✅ Memory leak detection
- ✅ Error rate monitoring
- ✅ Throughput measurement

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis instance (Upstash)
- WooCommerce installation (for webhook testing)

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure database connection:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/ankkor_test"
   ```
3. Add Redis credentials:
   ```env
   UPSTASH_REDIS_REST_URL="your_redis_url"
   UPSTASH_REDIS_REST_TOKEN="your_redis_token"
   ```
4. Set webhook secret:
   ```env
   WOOCOMMERCE_WEBHOOK_SECRET="your_webhook_secret"
   ```

### Run All Tests
```bash
# Full test suite (includes load testing)
./scripts/phase1-tests/run-all-tests.sh

# Skip load tests for faster execution
./scripts/phase1-tests/run-all-tests.sh --skip-load
```

### Individual Test Components

#### Database Setup
```bash
node scripts/phase1-tests/database-setup.mjs
```

#### Functional Tests
```bash
node scripts/phase1-tests/test-runner.mjs
```

#### Load Testing
```bash
node scripts/phase1-tests/load-test.mjs
```

## 📊 Test Configuration

Edit `test-config.json` to customize:

```json
{
  "baseUrl": "http://localhost:3000",
  "timeout": 30000,
  "testDatabase": {
    "reset": true,
    "seedData": true
  },
  "loadTest": {
    "concurrentUsers": 50,
    "duration": 60,
    "rampUpTime": 10
  }
}
```

## 🔍 Understanding Test Results

### Functional Tests
- **PASSED**: All functionality works correctly
- **FAILED**: Issues detected, check error details

### Load Test Results
- **Requests/Second**: Throughput capability
- **Error Rate**: Percentage of failed requests
- **Response Times**: P50, P95, P99 percentiles
- **Performance Assessment**: 
  - ✅ **EXCELLENT**: Ready for production
  - ⚠️ **GOOD**: Acceptable for moderate load
  - ❌ **POOR**: Needs optimization

## 📋 Test Scenarios

### Cart Operations
- Create guest carts
- Add items with stock validation
- Update quantities
- Remove items
- Clear entire carts
- Merge guest to user carts

### Concurrency Tests
- Multiple users adding same product
- Simultaneous cart creation
- Stock reservation conflicts
- Database transaction conflicts

### Security Tests
- Invalid webhook signatures
- Rate limit enforcement
- Input validation attacks
- SQL injection attempts

### Error Scenarios
- Database connection failures
- Invalid product IDs
- Insufficient stock
- Malformed requests
- Network timeouts

## 🛠 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql "postgresql://user:password@localhost:5432/ankkor_test"
```

#### Redis Connection Failed
```bash
# Test Redis connection
curl -X POST https://your-redis-url/ping \
  -H "Authorization: Bearer your-token"
```

#### Application Not Starting
```bash
# Check port availability
netstat -tulpn | grep :3000

# Check logs
npm run dev 2>&1 | tee debug.log
```

#### Tests Timing Out
- Increase timeout in `test-config.json`
- Check database performance
- Verify network connectivity

### Debug Mode
Set `NODE_ENV=development` for verbose logging:
```bash
NODE_ENV=development node scripts/phase1-tests/test-runner.mjs
```

## 📈 Performance Benchmarks

### Expected Results (Local Development)
- **Response Time**: < 200ms average
- **Throughput**: > 50 requests/second
- **Error Rate**: < 1%
- **P95 Response Time**: < 500ms

### Production Targets
- **Response Time**: < 100ms average
- **Throughput**: > 100 requests/second
- **Error Rate**: < 0.1%
- **P95 Response Time**: < 200ms

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Phase 1 Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Run Phase 1 Tests
        run: ./scripts/phase1-tests/run-all-tests.sh --skip-load
```

### Production Deployment
```bash
# Pre-deployment validation
./scripts/phase1-tests/run-all-tests.sh

# Only deploy if all tests pass
if [ $? -eq 0 ]; then
  echo "✅ All tests passed - deploying to production"
  npm run deploy
else
  echo "❌ Tests failed - deployment blocked"
  exit 1
fi
```

## 📊 Reports

Tests generate detailed reports:
- **Console Output**: Real-time test progress
- **Log Files**: Detailed execution logs
- **HTML Report**: Visual test summary
- **JSON Results**: Machine-readable results

Report files are saved to `scripts/phase1-tests/` with timestamps.

## 🔧 Extending Tests

### Adding New Test Cases
1. Edit `test-runner.mjs`
2. Add test function to appropriate section
3. Follow existing patterns for error handling

### Custom Load Test Scenarios  
1. Edit `load-test.mjs`
2. Add new scenario to `getTestScenarios()`
3. Set appropriate weight for frequency

### Database Seed Data
1. Edit `test-config.json`
2. Add products to `testProducts` array
3. Re-run database setup

## 💡 Best Practices

### Before Running Tests
- [ ] Fresh database migration
- [ ] Clear Redis cache
- [ ] Stop other services on test ports
- [ ] Check environment variables

### During Development
- [ ] Run tests after each major change
- [ ] Monitor resource usage
- [ ] Check for memory leaks
- [ ] Validate error handling paths

### Production Readiness
- [ ] All tests pass consistently
- [ ] Performance meets targets
- [ ] Error rate < 0.1%
- [ ] Security tests pass
- [ ] Load test under expected traffic

## 🆘 Support

If you encounter issues:

1. **Check Prerequisites**: Ensure all dependencies are installed
2. **Review Logs**: Check detailed log files for error details
3. **Verify Environment**: Confirm all environment variables are set
4. **Test Individual Components**: Run components separately to isolate issues
5. **Check Network**: Ensure services can communicate

For complex issues, include:
- Test log files
- Environment configuration
- System specifications
- Error messages

---

**Remember**: These tests validate production readiness. All tests should pass before deploying Phase 1 to production.