import { Client } from '@upstash/qstash';

// Initialize the QStash client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

/**
 * Schedules a sync operation to keep WooCommerce product data fresh
 * Uses QStash as a reliable cron job alternative for Vercel deployments
 * 
 * @param syncType The type of sync to perform (inventory, all, or categories)
 * @param scheduleOptions Options for scheduling the job
 */
export async function scheduleSync(
  syncType: 'inventory' | 'all' | 'categories' = 'inventory',
  scheduleOptions?: { 
    cron?: string;    // Cron expression for repeated jobs
    delay?: number;   // Delay in seconds for one-time jobs
  }
) {
  try {
    if (!process.env.QSTASH_TOKEN) {
      console.error('QStash token not configured');
      return {
        success: false,
        error: 'QStash token not configured'
      };
    }

    if (!process.env.WOOCOMMERCE_REVALIDATION_SECRET) {
      console.error('Revalidation secret not configured');
      return {
        success: false,
        error: 'Revalidation secret not configured'
      };
    }
    
    // Base URL for the API endpoint (automatically detects environment)
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // The URL for the sync endpoint
    const syncUrl = `${baseUrl}/api/woo-sync`;
    
    // Prepare the message body
    const body = {
      token: process.env.WOOCOMMERCE_REVALIDATION_SECRET,
      type: syncType
    };
    
    // Options for the QStash client
    const qstashOptions: {
      delay?: number;
      cron?: string;
      deduplicationId?: string;
    } = {};
    
    // Configure scheduling options
    if (scheduleOptions?.cron) {
      qstashOptions.cron = scheduleOptions.cron;
      // Add a deduplication ID for recurring jobs to prevent duplicates
      qstashOptions.deduplicationId = `ankkor-woo-sync-${syncType}-${scheduleOptions.cron.replace(/\s+/g, '-')}`;
    } else if (scheduleOptions?.delay) {
      qstashOptions.delay = scheduleOptions.delay;
    }
    
    // Schedule the job with QStash
    const result = await qstashClient.publishJSON({
      url: syncUrl,
      body,
      ...qstashOptions
    });
    
    console.log(`Successfully scheduled ${syncType} sync with QStash. Message ID:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      scheduleType: scheduleOptions?.cron ? 'cron' : 'oneTime'
    };
  } catch (error) {
    console.error('Error scheduling sync with QStash:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Schedules regular inventory sync jobs
 * This function should be called during app initialization
 */
export async function setupRecurringJobs() {
  try {
    // Only run in production environment
    if (process.env.NODE_ENV !== 'production') {
      console.log('Skipping recurring job setup in development environment');
      return;
    }
    
    // Schedule hourly inventory sync (every hour at minute 15)
    await scheduleSync('inventory', { 
      cron: '15 * * * *'
    });
    
    // Schedule daily full products sync (every day at 3:30 AM)
    await scheduleSync('all', { 
      cron: '30 3 * * *'
    });
    
    // Schedule weekly categories sync (every Sunday at 2:00 AM)
    await scheduleSync('categories', {
      cron: '0 2 * * 0'
    });
    
    console.log('Successfully set up recurring sync jobs with QStash for WooCommerce');
  } catch (error) {
    console.error('Error setting up recurring jobs:', error);
  }
}

/**
 * Manually trigger a sync job for immediate execution
 * 
 * @param syncType The type of sync to perform
 * @returns Result of the sync operation
 */
export async function triggerManualSync(syncType: 'inventory' | 'all' | 'categories' = 'inventory') {
  try {
    const result = await scheduleSync(syncType);
    return result;
  } catch (error) {
    console.error(`Error triggering manual ${syncType} sync:`, error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * WooCommerce QStash integration for scheduled tasks
 */

/**
 * Schedule an inventory synchronization job
 * @returns Promise with the result of the scheduling operation
 */
export async function scheduleInventorySync() {
  try {
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Simulating inventory sync scheduling');
      return {
        messageId: 'dev-mode-' + Date.now(),
        scheduled: true
      };
    }
    
    // In production, we would use QStash to schedule the job
    // This is a placeholder for the actual implementation
    const response = await fetch('/api/woo-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync-inventory',
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to schedule inventory sync: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error scheduling inventory sync:', error);
    throw error;
  }
} 