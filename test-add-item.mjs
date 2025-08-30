// Test add item functionality
async function testAddItem() {
  try {
    // First create a cart
    const createResponse = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_cart',
        sessionId: 'test-add-item-' + Date.now()
      })
    });
    
    const cart = await createResponse.json();
    console.log('Cart created:', cart);
    
    // Then try to add an item
    const addResponse = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_item',
        cartId: cart.cart.id,
        item: {
          productId: '1',
          quantity: 2,
          price: 99.99,
          name: 'Test Product 1'
        }
      })
    });
    
    console.log('Add response status:', addResponse.status);
    const addResult = await addResponse.text();
    console.log('Add response:', addResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAddItem();