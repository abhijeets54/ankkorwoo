'use client';

/**
 * Safely parses a WooCommerce price string into a number
 * Handles various formats including:
 * - Simple numbers: "123"
 * - Decimal strings: "123.45"
 * - Currency strings: "₹123.45"
 * - Empty or invalid values
 */
export function parseWooPrice(price: string | number | null | undefined): number {
    if (typeof price === 'number') return price;
    if (!price) return 0;

    // Remove currency symbols and any non-numeric chars except decimal point
    const cleaned = price.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a number as Indian Rupees
 * @param amount The amount to format
 * @param withSymbol Whether to include the ₹ symbol
 */
export function formatIndianPrice(amount: number | string, withSymbol: boolean = true): string {
    const num = typeof amount === 'string' ? parseWooPrice(amount) : amount;
    
    if (isNaN(num)) return withSymbol ? '₹0.00' : '0.00';

    // Format with 2 decimal places
    const formatted = num.toFixed(2);
    
    // Add symbol if requested
    return withSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats an order total from WooCommerce
 * Handles null/undefined values and ensures proper display
 */
export function formatOrderTotal(total: string | number | null | undefined): string {
    const amount = parseWooPrice(total);
    return formatIndianPrice(amount);
}

/**
 * Calculates line item unit price
 */
export function calculateUnitPrice(total: string | number, quantity: number): string {
    const totalAmount = parseWooPrice(total);
    const unitPrice = quantity > 0 ? totalAmount / quantity : 0;
    return formatIndianPrice(unitPrice);
}