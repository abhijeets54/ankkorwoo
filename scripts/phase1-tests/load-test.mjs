#!/usr/bin/env node

/**
 * Load Testing Script for Phase 1
 * 
 * Tests the production readiness under load:
 * - Concurrent cart operations
 * - Stock reservation conflicts
 * - Error rate under pressure
 * - Response time degradation
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, 'test-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

if (isMainThread) {
  // Main thread - orchestrates load test
  class LoadTester {
    constructor() {
      this.baseUrl = config.baseUrl || 'http://localhost:3000';
      this.concurrentUsers = config.loadTest.concurrentUsers || 50;
      this.duration = config.loadTest.duration || 60; // seconds
      this.rampUpTime = config.loadTest.rampUpTime || 10; // seconds
      
      this.results = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: new Map(),
        startTime: 0,
        endTime: 0
      };
    }

    async runLoadTest() {
      log('\\n🚀 Starting Load Test for Phase 1', 'bright');
      log('='.repeat(60), 'blue');
      log(`Concurrent Users: ${this.concurrentUsers}`, 'cyan');
      log(`Test Duration: ${this.duration} seconds`, 'cyan');
      log(`Ramp-up Time: ${this.rampUpTime} seconds`, 'cyan');
      log(`Target URL: ${this.baseUrl}`, 'cyan');

      this.results.startTime = Date.now();

      // Create workers for concurrent load
      const workers = [];
      const workerResults = [];

      // Calculate ramp-up intervals
      const rampUpInterval = (this.rampUpTime * 1000) / this.concurrentUsers;
      
      for (let i = 0; i < this.concurrentUsers; i++) {
        const worker = new Worker(__filename, {
          workerData: {
            workerId: i,
            baseUrl: this.baseUrl,
            duration: this.duration,
            startDelay: i * rampUpInterval,
            testScenarios: this.getTestScenarios()
          }
        });

        workers.push(worker);
        
        worker.on('message', (result) => {
          workerResults.push(result);
        });

        worker.on('error', (error) => {
          log(`Worker ${i} error: ${error.message}`, 'red');
        });
      }

      // Wait for all workers to complete
      await Promise.all(workers.map(worker => new Promise(resolve => {
        worker.on('exit', resolve);
      })));

      this.results.endTime = Date.now();
      
      // Aggregate results
      this.aggregateResults(workerResults);
      this.printResults();
    }

    getTestScenarios() {
      return [
        {
          name: 'Create Cart',
          weight: 0.2,
          action: async (client) => {
            const sessionId = \`load_test_\${Date.now()}_\${Math.random().toString(36).substring(2, 15)}\`;
            return client.makeRequest('/api/cart', {
              method: 'POST',
              body: JSON.stringify({
                action: 'create_cart',
                sessionId
              })
            });
          }
        },
        {
          name: 'Add to Cart',
          weight: 0.4,
          action: async (client, context) => {
            if (!context.cartId) {
              // Create cart first
              const cartResponse = await client.makeRequest('/api/cart', {
                method: 'POST',
                body: JSON.stringify({
                  action: 'create_cart',
                  sessionId: context.sessionId
                })
              });
              
              if (cartResponse.ok && cartResponse.data.success) {
                context.cartId = cartResponse.data.cart.id;
              } else {
                throw new Error('Failed to create cart');
              }
            }

            const productId = Math.random() > 0.5 ? '1' : '2';
            const quantity = Math.floor(Math.random() * 3) + 1;
            
            return client.makeRequest('/api/cart', {
              method: 'POST',
              body: JSON.stringify({
                action: 'add_item',
                cartId: context.cartId,
                sessionId: context.sessionId,
                item: {
                  productId,
                  quantity,
                  price: productId === '1' ? 99.99 : 149.99,
                  name: \`Load Test Product \${productId}\`
                }
              })
            });
          }
        },
        {
          name: 'Get Cart',
          weight: 0.2,
          action: async (client, context) => {
            if (!context.cartId) {
              // Create cart first
              const cartResponse = await client.makeRequest('/api/cart', {
                method: 'POST',
                body: JSON.stringify({
                  action: 'create_cart',
                  sessionId: context.sessionId
                })
              });
              
              if (cartResponse.ok && cartResponse.data.success) {
                context.cartId = cartResponse.data.cart.id;
              }
            }

            return client.makeRequest(\`/api/cart?cartId=\${context.cartId}\`);
          }
        },
        {
          name: 'Stock Check',
          weight: 0.2,
          action: async (client) => {
            const productId = Math.random() > 0.5 ? '1' : '2';
            return client.makeRequest(\`/api/reservations?action=check_stock&productId=\${productId}\`);
          }
        }
      ];
    }

    aggregateResults(workerResults) {
      for (const result of workerResults) {
        this.results.totalRequests += result.totalRequests;
        this.results.successfulRequests += result.successfulRequests;
        this.results.failedRequests += result.failedRequests;
        this.results.responseTimes.push(...result.responseTimes);
        
        // Aggregate errors
        for (const [error, count] of result.errors) {
          this.results.errors.set(error, (this.results.errors.get(error) || 0) + count);
        }
      }
    }

    printResults() {
      const duration = (this.results.endTime - this.results.startTime) / 1000;
      const requestsPerSecond = this.results.totalRequests / duration;
      const errorRate = (this.results.failedRequests / this.results.totalRequests * 100).toFixed(2);
      
      // Calculate response time statistics
      this.results.responseTimes.sort((a, b) => a - b);
      const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
      const p50 = this.results.responseTimes[Math.floor(this.results.responseTimes.length * 0.5)];
      const p95 = this.results.responseTimes[Math.floor(this.results.responseTimes.length * 0.95)];
      const p99 = this.results.responseTimes[Math.floor(this.results.responseTimes.length * 0.99)];

      log('\\n📊 LOAD TEST RESULTS', 'bright');
      log('='.repeat(60), 'blue');
      
      log(\`Test Duration: \${duration.toFixed(2)} seconds\`, 'white');
      log(\`Total Requests: \${this.results.totalRequests}\`, 'white');
      log(\`Successful Requests: \${this.results.successfulRequests}\`, 'green');
      log(\`Failed Requests: \${this.results.failedRequests}\`, 'red');
      log(\`Error Rate: \${errorRate}%\`, errorRate < 5 ? 'green' : errorRate < 10 ? 'yellow' : 'red');
      log(\`Requests/Second: \${requestsPerSecond.toFixed(2)}\`, 'cyan');
      
      log('\\n📈 RESPONSE TIME STATISTICS', 'magenta');
      log(\`Average: \${avgResponseTime.toFixed(2)}ms\`, 'white');
      log(\`Median (P50): \${p50}ms\`, 'white');
      log(\`95th Percentile: \${p95}ms\`, 'white');
      log(\`99th Percentile: \${p99}ms\`, 'white');
      
      if (this.results.errors.size > 0) {
        log('\\n❌ ERROR BREAKDOWN', 'red');
        for (const [error, count] of this.results.errors) {
          log(\`  \${error}: \${count} occurrences\`, 'red');
        }
      }
      
      // Performance assessment
      log('\\n🎯 PERFORMANCE ASSESSMENT', 'bright');
      if (errorRate < 1 && avgResponseTime < 500 && requestsPerSecond > 10) {
        log('✅ EXCELLENT - Ready for production load', 'green');
      } else if (errorRate < 5 && avgResponseTime < 1000 && requestsPerSecond > 5) {
        log('⚠️  GOOD - Acceptable for moderate load', 'yellow');
      } else {
        log('❌ POOR - Needs optimization before production', 'red');
      }
      
      log('\\n' + '='.repeat(60), 'blue');
    }
  }

  // Run load test
  const loadTester = new LoadTester();
  loadTester.runLoadTest().catch(error => {
    log(\`\\n💥 Load test failed: \${error.message}\`, 'red');
    process.exit(1);
  });

} else {
  // Worker thread - simulates individual user
  class LoadTestClient {
    constructor(workerId, baseUrl) {
      this.workerId = workerId;
      this.baseUrl = baseUrl;
      this.sessionId = \`worker_\${workerId}_\${Date.now()}\`;
      this.context = {
        sessionId: this.sessionId,
        cartId: null
      };
    }

    async makeRequest(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : \`\${this.baseUrl}\${endpoint}\`;
      const startTime = Date.now();
      
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': \`LoadTest-Worker-\${this.workerId}\`
        }
      };

      const finalOptions = { ...defaultOptions, ...options };
      
      try {
        const response = await fetch(url, finalOptions);
        const responseTime = Date.now() - startTime;
        
        let data = null;
        try {
          const text = await response.text();
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        
        return {
          ok: response.ok,
          status: response.status,
          data,
          responseTime
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
          ok: false,
          status: 0,
          error: error.message,
          data: null,
          responseTime
        };
      }
    }

    async runScenario(scenario) {
      try {
        const result = await scenario.action(this, this.context);
        return {
          success: result.ok,
          responseTime: result.responseTime,
          error: result.ok ? null : \`HTTP \${result.status}: \${result.error || 'Unknown error'}\`
        };
      } catch (error) {
        return {
          success: false,
          responseTime: 0,
          error: error.message
        };
      }
    }
  }

  // Worker main function
  async function workerMain() {
    const { workerId, baseUrl, duration, startDelay, testScenarios } = workerData;
    
    // Wait for start delay (ramp-up)
    await new Promise(resolve => setTimeout(resolve, startDelay));
    
    const client = new LoadTestClient(workerId, baseUrl);
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: new Map()
    };

    const endTime = Date.now() + (duration * 1000);
    
    while (Date.now() < endTime) {
      // Select random scenario based on weights
      const rand = Math.random();
      let cumulativeWeight = 0;
      let selectedScenario = null;
      
      for (const scenario of testScenarios) {
        cumulativeWeight += scenario.weight;
        if (rand <= cumulativeWeight) {
          selectedScenario = scenario;
          break;
        }
      }
      
      if (!selectedScenario) {
        selectedScenario = testScenarios[0];
      }
      
      // Execute scenario
      const result = await client.runScenario(selectedScenario);
      
      results.totalRequests++;
      
      if (result.success) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        const errorKey = result.error || 'Unknown error';
        results.errors.set(errorKey, (results.errors.get(errorKey) || 0) + 1);
      }
      
      results.responseTimes.push(result.responseTime);
      
      // Small delay between requests to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }
    
    // Convert Map to Array for serialization
    const errorsArray = Array.from(results.errors.entries());
    results.errors = errorsArray;
    
    // Send results back to main thread
    parentPort.postMessage(results);
  }

  workerMain().catch(error => {
    parentPort.postMessage({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 1,
      responseTimes: [],
      errors: [['Worker Error', error.message]]
    });
  });
}