import { setupRecurringJobs } from './wooQstash';

/**
 * Initialize application services
 * - Sets up QStash recurring jobs for WooCommerce data synchronization
 */
export async function initializeServices() {
  try {
    console.log('Initializing application services...');

    console.log('Initializing WooCommerce services...');
    // Set up recurring jobs with QStash for WooCommerce inventory and product synchronization
    await setupRecurringJobs();

    console.log('Application services initialized successfully');
  } catch (error) {
    console.error('Error initializing application services:', error);
  }
}

// Self-invoking function to initialize services when this module is imported
(async () => {
  // Only run in production to avoid duplicate initialization in development
  if (process.env.NODE_ENV === 'production') {
    await initializeServices();
  }
})(); 