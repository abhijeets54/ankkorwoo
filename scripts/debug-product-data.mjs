/**
 * Debug Script: Check Product Data from WooCommerce
 *
 * This script fetches a product and shows its structure
 * to help diagnose why size selectors aren't appearing
 */

import { GraphQLClient, gql } from 'graphql-request';

const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://maroon-lapwing-781450.hostingersite.com/graphql';

const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const PRODUCT_QUERY = gql`
  query GetProducts {
    products(first: 5) {
      nodes {
        id
        databaseId
        name
        slug
        type
        ... on SimpleProduct {
          price
          stockStatus
        }
        ... on VariableProduct {
          price
          stockStatus
          attributes {
            nodes {
              name
              options
            }
          }
          variations(first: 10) {
            nodes {
              id
              databaseId
              name
              price
              stockStatus
              stockQuantity
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function debugProducts() {
  try {
    console.log('🔍 Fetching products from WooCommerce...\n');
    console.log('GraphQL Endpoint:', endpoint);
    console.log('');

    const data = await client.request(PRODUCT_QUERY);
    const products = data.products.nodes;

    console.log(`✅ Found ${products.length} products\n`);
    console.log('='.repeat(80));

    products.forEach((product, index) => {
      console.log(`\n📦 Product ${index + 1}: ${product.name}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${product.databaseId}`);
      console.log(`   Slug: ${product.slug}`);
      console.log(`   Type: ${product.type}`);
      console.log(`   Price: ${product.price || 'N/A'}`);
      console.log(`   Stock Status: ${product.stockStatus || 'N/A'}`);

      if (product.type === 'VARIABLE') {
        console.log('\n   🔧 VARIABLE PRODUCT DETAILS:');

        // Check attributes
        if (product.attributes && product.attributes.nodes) {
          console.log(`\n   📋 Attributes (${product.attributes.nodes.length}):`);
          product.attributes.nodes.forEach(attr => {
            console.log(`      - ${attr.name}: [${attr.options.join(', ')}]`);

            // Check if this is a size attribute
            const isSizeAttribute = ['size', 'Size', 'SIZE', 'pa_size'].includes(attr.name);
            if (isSizeAttribute) {
              console.log(`        ✅ SIZE ATTRIBUTE FOUND!`);
            }
          });
        } else {
          console.log('   ❌ No attributes found');
        }

        // Check variations
        if (product.variations && product.variations.nodes) {
          console.log(`\n   🔄 Variations (${product.variations.nodes.length}):`);
          product.variations.nodes.forEach((variation, vIndex) => {
            console.log(`\n      Variation ${vIndex + 1}:`);
            console.log(`         ID: ${variation.databaseId}`);
            console.log(`         Name: ${variation.name}`);
            console.log(`         Price: ${variation.price}`);
            console.log(`         Stock: ${variation.stockStatus} (Qty: ${variation.stockQuantity})`);

            if (variation.attributes && variation.attributes.nodes) {
              console.log(`         Attributes:`);
              variation.attributes.nodes.forEach(attr => {
                console.log(`            - ${attr.name}: ${attr.value}`);
              });
            }
          });
        } else {
          console.log('   ❌ No variations found');
        }
      } else {
        console.log(`\n   ℹ️  This is a ${product.type} product (not variable)`);
        console.log('   ⚠️  Size selector only works with VARIABLE products');
      }

      console.log('\n' + '='.repeat(80));
    });

    // Summary
    console.log('\n📊 SUMMARY:\n');
    const variableProducts = products.filter(p => p.type === 'VARIABLE');
    const simpleProducts = products.filter(p => p.type === 'SIMPLE');

    console.log(`   Total Products: ${products.length}`);
    console.log(`   Variable Products: ${variableProducts.length}`);
    console.log(`   Simple Products: ${simpleProducts.length}`);

    const productsWithSizes = variableProducts.filter(p =>
      p.attributes?.nodes?.some(attr =>
        ['size', 'Size', 'SIZE', 'pa_size'].includes(attr.name)
      )
    );

    const productsWithVariations = variableProducts.filter(p =>
      p.variations?.nodes?.length > 0
    );

    console.log(`   Products with Size Attributes: ${productsWithSizes.length}`);
    console.log(`   Products with Variations: ${productsWithVariations.length}`);

    console.log('\n💡 RECOMMENDATIONS:\n');

    if (variableProducts.length === 0) {
      console.log('   ❌ No variable products found!');
      console.log('   → You need to create Variable Products in WooCommerce');
      console.log('   → Go to: WordPress Admin → Products → Add New → Product Data: Variable Product');
    }

    if (productsWithSizes.length === 0 && variableProducts.length > 0) {
      console.log('   ❌ Variable products exist but have no size attributes!');
      console.log('   → Add a "Size" attribute to your variable products');
      console.log('   → Go to: Product edit page → Attributes → Add Size');
    }

    if (productsWithVariations.length === 0 && variableProducts.length > 0) {
      console.log('   ❌ Variable products exist but have no variations!');
      console.log('   → Create variations for each size');
      console.log('   → Go to: Product edit page → Variations → Generate variations');
    }

    if (productsWithSizes.length > 0 && productsWithVariations.length > 0) {
      console.log('   ✅ Everything looks good!');
      console.log('   → Products are properly configured with sizes');
      console.log('   → If size selector still not showing, check browser console for errors');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

// Run the debug script
debugProducts();
