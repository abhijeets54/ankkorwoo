#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  try {
    // Test products from test-config.json
    const testProducts = [
      {
        productId: "1",
        name: "Test Product 1", 
        totalStock: 100,
        availableStock: 100,
        reservedStock: 0
      },
      {
        productId: "2",
        name: "Test Product 2",
        totalStock: 50,
        availableStock: 50,
        reservedStock: 0
      },
      // Variations for product 2
      {
        productId: "2",
        variationId: "21",
        name: "Test Product 2 - Small",
        totalStock: 20,
        availableStock: 20,
        reservedStock: 0
      },
      {
        productId: "2", 
        variationId: "22",
        name: "Test Product 2 - Large",
        totalStock: 30,
        availableStock: 30,
        reservedStock: 0
      }
    ];

    for (const product of testProducts) {
      console.log(`📦 Creating stock for Product ${product.productId}${product.variationId ? ` (${product.variationId})` : ''}`);
      
      // Check if record exists first
      const existingStock = await prisma.productStock.findFirst({
        where: {
          productId: product.productId,
          variationId: product.variationId || null
        }
      });

      if (existingStock) {
        // Update existing record
        await prisma.productStock.update({
          where: { id: existingStock.id },
          data: {
            totalStock: product.totalStock,
            availableStock: product.availableStock,
            reservedStock: product.reservedStock,
            lastSyncAt: new Date(),
            syncSource: 'manual'
          }
        });
      } else {
        // Create new record
        await prisma.productStock.create({
          data: {
            productId: product.productId,
            variationId: product.variationId || null,
            totalStock: product.totalStock,
            availableStock: product.availableStock,
            reservedStock: product.reservedStock,
            lastSyncAt: new Date(),
            syncSource: 'manual'
          }
        });
      }
    }

    // Verify seeded data
    const stockCount = await prisma.productStock.count();
    console.log(`✅ Seeded ${stockCount} stock records`);
    
    const stockRecords = await prisma.productStock.findMany();
    stockRecords.forEach(stock => {
      console.log(`   📊 Product ${stock.productId}${stock.variationId ? ` (${stock.variationId})` : ''}: ${stock.availableStock}/${stock.totalStock} available`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();