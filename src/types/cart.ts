export interface CartItemAttribute {
  name: string;
  value: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  attributes?: CartItemAttribute[];
  image?: string;
  stockQuantity?: number;
  variation_id?: string;
  product_id?: string;
  size?: string;
  sku?: string;
}

export interface CartStore {
  items: CartItem[];
  // Add other fields as needed
}