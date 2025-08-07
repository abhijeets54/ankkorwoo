import { create } from 'zustand';
import { getAllProducts, normalizeProduct } from '@/lib/woocommerce';

export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image: string;
  price: string;
  categories: string[];
  attributes: string[];
}

interface SearchState {
  // Products data
  allProducts: SearchProduct[];
  filteredProducts: SearchProduct[];
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Search state
  query: string;
  
  // Actions
  loadProducts: () => Promise<void>;
  setQuery: (query: string) => void;
  filterProducts: (query: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  allProducts: [],
  filteredProducts: [],
  isLoading: false,
  isInitialized: false,
  query: '',

  // Load all products from WooCommerce
  loadProducts: async () => {
    const { isInitialized } = get();
    
    // Don't reload if already initialized
    if (isInitialized) return;
    
    set({ isLoading: true });
    
    try {
      const products = await getAllProducts(500); // Load comprehensive product list

      // Format products for search using the same normalization as other components
      const formattedProducts: SearchProduct[] = products
        .map((product: any) => {
          // Log the product data to debug pricing issues
          console.log('🔍 Search Store - Processing product:', {
            id: product.id,
            name: product.name,
            price: product.price,
            regularPrice: product.regularPrice,
            salePrice: product.salePrice,
            type: product.type || product.__typename
          });

          // Use the same normalization function as collection pages
          const normalizedProduct = normalizeProduct(product);
          if (!normalizedProduct) return null;

          // Extract data from normalized product
          const imageUrl = product.image?.sourceUrl || '';
          const categories = product.productCategories?.nodes?.map((cat: any) => cat.name) || [];
          const attributes = product.attributes?.nodes?.flatMap((attr: any) => attr.options || []) || [];

          // Get price directly from product data - similar to other components
          let price = '0.00';
          if (product.price && !isNaN(parseFloat(product.price))) {
            price = parseFloat(product.price).toFixed(2);
          } else if (product.regularPrice && !isNaN(parseFloat(product.regularPrice))) {
            price = parseFloat(product.regularPrice).toFixed(2);
          }

          console.log('💰 Final price for', product.name, ':', price);

          return {
            id: product.id || '',
            name: product.name || 'Untitled Product',
            slug: product.slug || '',
            description: product.description || '',
            shortDescription: product.shortDescription || '',
            image: imageUrl,
            price,
            categories,
            attributes
          };
        })
        .filter(Boolean) as SearchProduct[];
      
      set({ 
        allProducts: formattedProducts, 
        isLoading: false, 
        isInitialized: true 
      });
    } catch (error) {
      console.error('Error loading products for search:', error);
      set({ isLoading: false });
    }
  },

  // Set search query
  setQuery: (query: string) => {
    set({ query });
    get().filterProducts(query);
  },

  // Filter products based on search query
  filterProducts: (query: string) => {
    const { allProducts } = get();
    
    if (!query.trim()) {
      set({ filteredProducts: [] });
      return;
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const results = allProducts.filter(product => {
      if (!product) return false;
      
      // Check if any search term matches product fields
      return searchTerms.every(term => {
        const nameMatch = product.name?.toLowerCase().includes(term);
        const descriptionMatch = product.description?.toLowerCase().includes(term);
        const shortDescMatch = product.shortDescription?.toLowerCase().includes(term);
        const categoryMatch = product.categories?.some(cat => cat.toLowerCase().includes(term));
        const attributeMatch = product.attributes?.some(attr => attr.toLowerCase().includes(term));
        
        return nameMatch || descriptionMatch || shortDescMatch || categoryMatch || attributeMatch;
      });
    });
    
    set({ filteredProducts: results });
  },

  // Reset search state
  reset: () => {
    set({ 
      query: '', 
      filteredProducts: [] 
    });
  }
}));
