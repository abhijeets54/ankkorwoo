'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server action to revalidate a product page
 * 
 * @param handle Product handle to revalidate
 */
export async function revalidateProductAction(handle: string) {
  try {
    // Revalidate both the specific product and the product tag
    revalidatePath(`/product/${handle}`);
    revalidateTag(`product-${handle}`);
    
    // Also revalidate the products collection pages which might show this product
    revalidatePath('/collection');
    revalidateTag('products');
    
    return { success: true, message: `Successfully revalidated product: ${handle}` };
  } catch (error) {
    console.error(`Error revalidating product ${handle}:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during revalidation' 
    };
  }
}

/**
 * Server action to revalidate all inventory-related pages
 */
export async function revalidateInventoryAction() {
  try {
    revalidatePath('/product');
    revalidatePath('/collection');
    revalidateTag('products');
    revalidateTag('inventory');
    
    return { success: true, message: 'Successfully revalidated inventory' };
  } catch (error) {
    console.error('Error revalidating inventory:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during inventory revalidation' 
    };
  }
}

/**
 * Server action to revalidate the entire site
 */
export async function revalidateAllAction() {
  try {
    revalidatePath('/', 'layout');
    revalidateTag('global');
    
    return { success: true, message: 'Successfully revalidated all pages' };
  } catch (error) {
    console.error('Error revalidating all pages:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during site-wide revalidation' 
    };
  }
}

/**
 * Server action to revalidate collection page
 * 
 * @param handle Collection handle to revalidate
 */
export async function revalidateCollectionAction(handle: string) {
  try {
    revalidatePath(`/collection/${handle}`);
    revalidateTag(`collection-${handle}`);
    revalidatePath('/collection');
    
    return { success: true, message: `Successfully revalidated collection: ${handle}` };
  } catch (error) {
    console.error(`Error revalidating collection ${handle}:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during collection revalidation' 
    };
  }
}

/**
 * Server action to set user preferences in cookies
 * 
 * @param key Cookie key
 * @param value Cookie value
 * @param maxAge Cookie max age in seconds (default: 30 days)
 */
export async function setPreferenceCookie(key: string, value: string, maxAge: number = 30 * 24 * 60 * 60) {
  try {
    const cookieStore = cookies();
    cookieStore.set(key, value, { 
      maxAge, 
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Error setting preference cookie ${key}:`, error);
    return { success: false };
  }
}

/**
 * Server action to delete a user preference cookie
 * 
 * @param key Cookie key to delete
 */
export async function deletePreferenceCookie(key: string) {
  try {
    const cookieStore = cookies();
    cookieStore.delete(key);
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting preference cookie ${key}:`, error);
    return { success: false };
  }
}

/**
 * Server action to handle redirects
 * 
 * @param destination Destination URL to redirect to
 */
export async function redirectAction(destination: string) {
  redirect(destination);
} 