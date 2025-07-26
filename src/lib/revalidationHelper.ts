import { revalidateProductAction, revalidateInventoryAction, revalidateAllAction } from './actions';

/**
 * Utility functions for safe revalidation in serverless environments
 * These helpers now use server actions for more reliable revalidation
 */

/**
 * Type definition for revalidation result
 */
type RevalidationResult = {
  success: boolean;
  errors: string[];
};

/**
 * Revalidate a product and all associated pages
 * 
 * @param handle The product handle
 * @returns Result of the revalidation attempt
 */
export const revalidateProduct = async (handle: string) => {
  try {
    const result = await revalidateProductAction(handle);
    return {
      product: {
        success: result.success,
        errors: []
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during product revalidation';
    console.error(`Error revalidating product ${handle}:`, errorMessage);
    return {
      product: {
        success: false,
        errors: [errorMessage]
      }
    };
  }
};

/**
 * Revalidate a collection and all associated pages
 * 
 * @param handle The collection handle
 * @returns Result of the revalidation attempt
 */
export const revalidateCollection = async (handle: string) => {
  try {
    // For collections, we'll use the inventory action since collections
    // are part of the inventory revalidation
    await revalidateInventoryAction();
    return {
      collection: {
        success: true,
        errors: []
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during collection revalidation';
    console.error(`Error revalidating collection ${handle}:`, errorMessage);
    return {
      collection: {
        success: false,
        errors: [errorMessage]
      }
    };
  }
};

/**
 * Revalidate all primary page types
 * Use this for global updates that affect multiple sections of the site
 * 
 * @returns Results of all revalidation attempts
 */
export const revalidateAllPages = async () => {
  try {
    await revalidateAllAction();
    return {
      success: true,
      errors: []
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during global revalidation';
    console.error('Error revalidating all pages:', errorMessage);
    return {
      success: false,
      errors: [errorMessage]
    };
  }
};

/**
 * Revalidate all inventory-related pages and caches
 * 
 * @returns Results of inventory revalidation attempts
 */
export const revalidateInventory = async () => {
  try {
    await revalidateInventoryAction();
    return {
      success: true,
      errors: []
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during inventory revalidation';
    console.error('Error revalidating inventory:', errorMessage);
    return {
      success: false,
      errors: [errorMessage]
    };
  }
}; 