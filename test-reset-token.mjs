import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const testToken = 'f6qjnn2fanwp3w6icn1745x4b650t8ux'; // From your URL

console.log('🔧 Testing Reset Password Token Validation');
console.log('===========================================\n');

console.log('Testing token:', testToken);

try {
  const response = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reset-password',
      token: testToken,
      password: 'TestPassword123!',
    }),
  });
  
  const result = await response.json();
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Token validation successful');
  } else {
    console.log('❌ Token validation failed:', result.message);
  }
  
} catch (error) {
  console.error('❌ Request failed:', error.message);
}