import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { updateInventoryMappings } from '@/lib/inventoryMapping';
import { isRedisAvailable } from '@/lib/redis';

// Path to the old inventory mapping file
const INVENTORY_MAP_PATH = path.join(process.cwd(), '.inventory-map.json');

/**
 * Admin API route to migrate inventory mappings from file to Redis
 * This is a one-time migration utility
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure Redis is available
    if (!isRedisAvailable()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Redis is not available. Check your environment variables.' 
        },
        { status: 500 }
      );
    }
    
    // Check if the file exists
    let fileExists = false;
    try {
      await fs.access(INVENTORY_MAP_PATH);
      fileExists = true;
    } catch (error) {
      fileExists = false;
    }
    
    if (!fileExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Inventory mapping file does not exist. Nothing to migrate.' 
        },
        { status: 404 }
      );
    }
    
    // Read the file
    const data = await fs.readFile(INVENTORY_MAP_PATH, 'utf-8');
    const mappings = JSON.parse(data) as Record<string, string>;
    
    if (Object.keys(mappings).length === 0) {
      return NextResponse.json(
        { success: true, message: 'No mappings found in file. Nothing to migrate.' },
        { status: 200 }
      );
    }
    
    // Convert to array format for updateInventoryMappings
    const mappingsArray = Object.entries(mappings).map(
      ([inventoryItemId, productHandle]) => ({
        inventoryItemId,
        productHandle
      })
    );
    
    // Update Redis with all mappings
    const success = await updateInventoryMappings(mappingsArray);
    
    if (success) {
      // Optionally rename the old file as backup
      const backupPath = `${INVENTORY_MAP_PATH}.backup-${Date.now()}`;
      await fs.rename(INVENTORY_MAP_PATH, backupPath);
      
      return NextResponse.json({
        success: true,
        message: `Successfully migrated ${mappingsArray.length} inventory mappings to Redis`,
        migrated: mappingsArray.length,
        backupPath
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update Redis with inventory mappings' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error migrating inventory mappings:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration error', 
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 