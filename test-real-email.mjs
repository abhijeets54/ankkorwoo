import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const testEmail = 'as9184635@gmail.com'; // Your actual email

console.log('🔒 Testing Forgot Password with Real Email');
console.log('==========================================\n');

try {
  console.log(`Testing forgot password request for: ${testEmail}`);
  
  const response = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'forgot-password',
      email: testEmail,
    }),
  });
  
  const result = await response.json();
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Request successful');
    console.log('📧 Check your email inbox and spam folder for the reset link');
  } else {
    console.log('❌ Request failed');
  }
  
} catch (error) {
  console.error('❌ Test failed with error:', error);
}