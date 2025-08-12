import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const testEmail = 'as9184635@gmail.com';

console.log('🔧 Testing Complete Password Reset Flow');
console.log('======================================\n');

async function testCompleteFlow() {
  try {
    // Step 1: Request password reset
    console.log('Step 1: Requesting password reset...');
    
    const forgotResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forgot-password',
        email: testEmail,
      }),
    });
    
    const forgotResult = await forgotResponse.json();
    console.log('Forgot password result:', forgotResult);
    
    if (!forgotResult.success) {
      console.log('❌ Failed to request password reset');
      return;
    }
    
    console.log('✅ Password reset requested successfully');
    console.log('📧 Check your email for the reset link with the token');
    console.log('⚠️ Please copy the token from the email and run the second test');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testTokenValidation(token) {
  console.log('\nStep 2: Testing token validation...');
  console.log('Token:', token);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reset-password',
        token: token,
        password: 'NewPassword123!',
      }),
    });
    
    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Password reset successful!');
    } else {
      console.log('❌ Password reset failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if token is provided as command line argument
const token = process.argv[2];

if (token) {
  // Test token validation
  await testTokenValidation(token);
} else {
  // Request new password reset
  await testCompleteFlow();
  console.log('\nTo test the token validation:');
  console.log('node test-full-reset-flow.mjs <token-from-email>');
}