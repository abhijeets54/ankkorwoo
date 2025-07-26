#!/usr/bin/env ts-node

/**
 * WooCommerce Synchronization Setup Script
 * 
 * This script configures the recurring sync jobs for WooCommerce data
 * using QStash as a reliable background job scheduler.
 */

import dotenv from 'dotenv';
import { setupRecurringJobs } from '../src/lib/wooQstash';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Setting up WooCommerce synchronization jobs...');
  
  try {
    // Verify environment variables
    if (!process.env.QSTASH_TOKEN) {
      console.error('Error: QSTASH_TOKEN environment variable is not set');
      process.exit(1);
    }
    
    if (!process.env.WOOCOMMERCE_REVALIDATION_SECRET) {
      console.error('Error: WOOCOMMERCE_REVALIDATION_SECRET environment variable is not set');
      process.exit(1);
    }
    
    // Set up recurring jobs
    await setupRecurringJobs();
    
    console.log('✅ WooCommerce synchronization jobs successfully configured');
    console.log('📋 The following jobs have been scheduled:');
    console.log('  • Inventory Sync: Every hour at 15 minutes past the hour');
    console.log('  • Full Product Sync: Daily at 3:30 AM');
    console.log('  • Categories Sync: Weekly on Sundays at 2:00 AM');
  } catch (error) {
    console.error('Error setting up WooCommerce synchronization jobs:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 