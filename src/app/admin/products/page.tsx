'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllProducts, normalizeProduct } from '@/lib/woocommerce';
import { Download, RefreshCw, Search, ChevronDown, ChevronUp, Eye } from 'lucide-react';

// Define types for product data
interface ProductImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  selectedOptions: Array<{name: string; value: string}>;
  quantityAvailable: number;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

interface Collection {
  id: string;
  title: string;
  handle: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];
  availableForSale: boolean;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  images: ProductImage[];
  variants: ProductVariant[];
  options: ProductOption[];
  collections: Collection[];
  metafields: Record<string, string>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllProducts(50); // Fetch up to 50 products
      const normalizedData = data.map((product: any) => normalizeProduct(product)).filter(Boolean) as Product[];
      setProducts(normalizedData);
    } catch (err) {
      setError('Failed to fetch products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'ankkor-products.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCsv = () => {
    // Create CSV header
    const headers = ['ID', 'Title', 'Handle', 'Product Type', 'Vendor', 'Price', 'Tags', 'Available'];
    
    // Create CSV rows
    const rows = products.map(product => [
      product.id,
      product.title,
      product.handle,
      product.productType || 'N/A',
      product.vendor || 'N/A',
      product.price,
      product.tags ? product.tags.join(', ') : '',
      product.availableForSale ? 'Yes' : 'No'
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    const exportFileDefaultName = 'ankkor-products.csv';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(searchLower) ||
      product.handle.toLowerCase().includes(searchLower) ||
      (product.productType && product.productType.toLowerCase().includes(searchLower)) ||
      (product.vendor && product.vendor.toLowerCase().includes(searchLower)) ||
      (product.tags && product.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)))
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valueA: string | number | null = null;
    let valueB: string | number | null = null;

    switch (sortField) {
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      case 'price':
        valueA = parseFloat(a.price);
        valueB = parseFloat(b.price);
        break;
      case 'productType':
        valueA = (a.productType || '').toLowerCase();
        valueB = (b.productType || '').toLowerCase();
        break;
      case 'vendor':
        valueA = (a.vendor || '').toLowerCase();
        valueB = (b.vendor || '').toLowerCase();
        break;
      default:
        valueA = a[sortField as keyof Product] as string | number;
        valueB = b[sortField as keyof Product] as string | number;
    }

    // Handle null values in comparison
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return sortDirection === 'asc' ? -1 : 1;
    if (valueB === null) return sortDirection === 'asc' ? 1 : -1;
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif font-bold text-[#2c2c27]">WooCommerce Products</h1>
        <div className="flex space-x-2">
          <button
            onClick={fetchProducts}
            className="flex items-center px-4 py-2 bg-[#2c2c27] text-white rounded hover:bg-[#3d3d35] transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center px-4 py-2 bg-[#5c5c52] text-white rounded hover:bg-[#6d6d62] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center px-4 py-2 bg-[#8a8778] text-white rounded hover:bg-[#9b9889] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8a8778]" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#e5e2d9] rounded bg-[#f8f8f5] focus:outline-none focus:ring-2 focus:ring-[#8a8778]"
          />
        </div>
      </div>

      <div className="flex mb-4">
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 rounded-l ${
            viewMode === 'table' ? 'bg-[#2c2c27] text-white' : 'bg-[#f4f3f0] text-[#2c2c27]'
          }`}
        >
          Table View
        </button>
        <button
          onClick={() => setViewMode('json')}
          className={`px-4 py-2 rounded-r ${
            viewMode === 'json' ? 'bg-[#2c2c27] text-white' : 'bg-[#f4f3f0] text-[#2c2c27]'
          }`}
        >
          JSON View
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2c2c27]"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-[#e5e2d9]">
                <thead className="bg-[#f4f3f0]">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        Title
                        {sortField === 'title' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('productType')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortField === 'productType' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('vendor')}
                    >
                      <div className="flex items-center">
                        Vendor
                        {sortField === 'vendor' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center">
                        Price
                        {sortField === 'price' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[#5c5c52] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#e5e2d9]">
                  {sortedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#f8f8f5]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover mr-3"
                              src={product.images[0].url}
                              alt={product.title}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-[#e5e2d9] mr-3"></div>
                          )}
                          <div className="text-sm font-medium text-[#2c2c27]">{product.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#5c5c52]">{product.productType || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#5c5c52]">{product.vendor || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#5c5c52]">
                          ${parseFloat(product.price).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.availableForSale
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.availableForSale ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-[#8a8778] hover:text-[#5c5c52] mr-3"
                        >
                          <Eye size={18} />
                        </button>
                        <Link
                          href={`/product/${product.handle}`}
                          className="text-[#2c2c27] hover:text-[#5c5c52]"
                          target="_blank"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[#f8f8f5] rounded-lg p-4 overflow-auto max-h-[600px]">
              <pre className="text-sm text-[#2c2c27]">
                {JSON.stringify(sortedProducts, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#e5e2d9]">
              <h2 className="text-xl font-serif font-bold text-[#2c2c27]">{selectedProduct.title}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-[#5c5c52] hover:text-[#2c2c27]"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.title}
                      className="w-full h-auto object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-64 bg-[#e5e2d9] rounded flex items-center justify-center">
                      <span className="text-[#8a8778]">No image available</span>
                    </div>
                  )}
                  
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {selectedProduct.images.slice(0, 4).map((image: any, index: number) => (
                        <img
                          key={index}
                          src={image.url}
                          alt={`${selectedProduct.title} - ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-[#8a8778]">Product Details</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="text-sm text-[#5c5c52]">Handle:</div>
                      <div className="text-sm text-[#2c2c27]">{selectedProduct.handle}</div>
                      
                      <div className="text-sm text-[#5c5c52]">Type:</div>
                      <div className="text-sm text-[#2c2c27]">{selectedProduct.productType || 'N/A'}</div>
                      
                      <div className="text-sm text-[#5c5c52]">Vendor:</div>
                      <div className="text-sm text-[#2c2c27]">{selectedProduct.vendor || 'N/A'}</div>
                      
                      <div className="text-sm text-[#5c5c52]">Price:</div>
                      <div className="text-sm text-[#2c2c27]">
                        ${parseFloat(selectedProduct.price).toFixed(2)}
                      </div>
                      
                      <div className="text-sm text-[#5c5c52]">Status:</div>
                      <div className="text-sm text-[#2c2c27]">
                        {selectedProduct.availableForSale ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[#8a8778]">Tags</h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedProduct.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4f3f0] text-[#5c5c52]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedProduct.options && selectedProduct.options.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[#8a8778]">Options</h3>
                      <div className="mt-2">
                        {selectedProduct.options.map((option: any, index: number) => (
                          <div key={index} className="mb-2">
                            <div className="text-sm font-medium text-[#2c2c27]">{option.name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {option.values.map((value: string, valueIndex: number) => (
                                <span
                                  key={valueIndex}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4f3f0] text-[#5c5c52]"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#8a8778]">Description</h3>
                <div 
                  className="mt-2 text-sm text-[#2c2c27] prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedProduct.descriptionHtml || selectedProduct.description || 'No description available.' }}
                />
              </div>
              
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-[#8a8778]">Variants ({selectedProduct.variants.length})</h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#e5e2d9]">
                      <thead className="bg-[#f4f3f0]">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider">Title</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider">Price</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-[#5c5c52] uppercase tracking-wider">Available</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#e5e2d9]">
                        {selectedProduct.variants.map((variant: any, index: number) => (
                          <tr key={index} className="hover:bg-[#f8f8f5]">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-[#2c2c27]">{variant.title}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-[#5c5c52]">${parseFloat(variant.price).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                variant.availableForSale
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {variant.availableForSale ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#e5e2d9] flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-[#f4f3f0] text-[#2c2c27] rounded hover:bg-[#e5e2d9] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 