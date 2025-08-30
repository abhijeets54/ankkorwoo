import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Clean existing test data
    await prisma.stockAuditLog.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.stockReservation.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.productStock.deleteMany({});

    // Create test product stocks
    const testProducts = [
      {
        id: "1",
        name: "Test Product 1",
        price: 99.99,
        stock: 100
      },
      {
        id: "2", 
        name: "Test Product 2",
        price: 149.99,
        stock: 50,
        variations: [
          {
            id: "21",
            name: "Small",
            stock: 20
          },
          {
            id: "22", 
            name: "Large",
            stock: 30
          }
        ]
      }
    ];

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
          
          console.log(`  ✓ Created stock for variation ${product.id}:${variation.id}: ${variation.stock} units`);
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
        
        console.log(`  ✓ Created stock for product ${product.id}: ${product.stock} units`);
      }
    }

    console.log('✅ Test data seeding completed');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();