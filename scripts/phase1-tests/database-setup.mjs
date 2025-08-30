#!/usr/bin/env node

/**
 * Database Setup Script for Phase 1 Tests
 * 
 * This script sets up the test database with:
 * - Schema migration
 * - Seed data for testing
 * - Test product inventory
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class DatabaseSetup {
  constructor() {
    this.projectRoot = join(__dirname, '..', '..');
  }

  async setup() {
    log('\\n🗄️  Setting up test database...', 'bright');
    log('='.repeat(50), 'blue');

    try {
      await this.checkPrerequisites();
      await this.setupPrisma();
      if (config.testDatabase.seedData) {
        await this.seedTestData();
      }
      await this.verifySetup();
      
      log('\\n✅ Database setup completed successfully!', 'green');
    } catch (error) {
      log(`\\n❌ Database setup failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    log('\\n🔍 Checking prerequisites...', 'cyan');

    // Check if .env file exists
    try {
      const envPath = join(this.projectRoot, '.env');
      readFileSync(envPath, 'utf8');
      log('  ✓ .env file found', 'green');
    } catch {
      log('  ⚠️  .env file not found', 'yellow');
      log('  Please create .env file with DATABASE_URL', 'yellow');
    }

    // Check if Prisma is installed
    try {
      execSync('npx prisma --version', { cwd: this.projectRoot, stdio: 'ignore' });
      log('  ✓ Prisma CLI available', 'green');
    } catch {
      log('  ❌ Prisma CLI not found', 'red');
      throw new Error('Please install Prisma CLI: npm install prisma @prisma/client');
    }

    // Check database connection
    try {
      log('  🔗 Testing database connection...', 'yellow');
      execSync('npx prisma db execute --stdin <<< "SELECT 1;"', { 
        cwd: this.projectRoot, 
        stdio: 'ignore' 
      });
      log('  ✓ Database connection successful', 'green');
    } catch {
      log('  ⚠️  Database connection test failed (continuing anyway)', 'yellow');
    }
  }

  async setupPrisma() {
    log('\\n📋 Setting up Prisma schema...', 'cyan');

    try {
      // Generate Prisma client
      log('  📦 Generating Prisma client...', 'yellow');
      execSync('npx prisma generate', { cwd: this.projectRoot });
      log('  ✓ Prisma client generated', 'green');

      // Run database migrations
      log('  🔄 Running database migrations...', 'yellow');
      execSync('npx prisma db push', { cwd: this.projectRoot });
      log('  ✓ Database schema updated', 'green');

    } catch (error) {
      throw new Error(`Prisma setup failed: ${error.message}`);
    }
  }

  async seedTestData() {
    log('\\n🌱 Seeding test data...', 'cyan');

    // Create seed data script
    const seedScript = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // Clean existing test data
  await prisma.stockAuditLog.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.stockReservation.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.productStock.deleteMany({});

  // Create test product stocks
  const testProducts = ${JSON.stringify(config.testProducts, null, 2)};
  
  for (const product of testProducts) {
    // Create variations if they exist, otherwise create base product
    if (product.variations) {
      for (const variation of product.variations) {
        await prisma.productStock.create({
          data: {
            productId: product.id,
            variationId: variation.id,
            totalStock: variation.stock,
            availableStock: variation.stock,
            reservedStock: 0,
            syncSource: 'seed_data'
          }
        });
        
        console.log(\`  ✓ Created stock for variation \${product.id}:\${variation.id}: \${variation.stock} units\`);
      }
    } else {
      await prisma.productStock.create({
        data: {
          productId: product.id,
          totalStock: product.stock,
          availableStock: product.stock,
          reservedStock: 0,
          syncSource: 'seed_data'
        }
      });
      
      console.log(\`  ✓ Created stock for product \${product.id}: \${product.stock} units\`);
    }
  }

  console.log('✅ Test data seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
    `;

    // Write seed script temporarily
    const seedPath = join(this.projectRoot, 'temp-seed.mjs');
    writeFileSync(seedPath, seedScript);

    try {
      // Run seed script
      execSync(`node ${seedPath}`, { cwd: this.projectRoot, stdio: 'inherit' });
      
      // Clean up temporary file
      unlinkSync(seedPath);
      
      log('  ✅ Test data seeded successfully', 'green');
    } catch (error) {
      // Clean up temporary file even if seeding fails
      try {
        unlinkSync(seedPath);
      } catch {}
      
      throw new Error(`Data seeding failed: ${error.message}`);
    }
  }

  async verifySetup() {
    log('\\n🔍 Verifying database setup...', 'cyan');

    const verificationScript = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    // Test basic connection
    await prisma.$queryRaw\`SELECT 1\`;
    console.log('  ✓ Database connection verified');
    
    // Check tables exist
    const productCount = await prisma.productStock.count();
    console.log(\`  ✓ Product stocks table: \${productCount} records\`);
    
    const cartCount = await prisma.cart.count();
    console.log(\`  ✓ Carts table: \${cartCount} records\`);
    
    const reservationCount = await prisma.stockReservation.count();
    console.log(\`  ✓ Stock reservations table: \${reservationCount} records\`);
    
    console.log('✅ Database verification completed');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
    `;

    // Write verification script temporarily
    const verifyPath = join(this.projectRoot, 'temp-verify.mjs');
    writeFileSync(verifyPath, verificationScript);

    try {
      // Run verification script
      execSync(`node ${verifyPath}`, { cwd: this.projectRoot, stdio: 'inherit' });
      
      // Clean up temporary file
      unlinkSync(verifyPath);
      
    } catch (error) {
      // Clean up temporary file even if verification fails
      try {
        unlinkSync(verifyPath);
      } catch {}
      
      throw new Error(`Database verification failed: ${error.message}`);
    }
  }
}

// Run database setup
const setup = new DatabaseSetup();
setup.setup().catch(error => {
  console.error('\\n💥 Setup failed:', error);
  process.exit(1);
});