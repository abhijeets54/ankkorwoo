// Test database connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_yUN4GIz6nrWu@ep-cold-hill-a1qua9br-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    
    // Check if tables exist
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('📊 Database tables created:');
    result.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('\n🎉 Database is ready for Phase 1 testing!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();