import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testEmail = 'test@example.com';

async function testForgotPasswordFlow() {
  console.log('🔒 Testing Forgot Password Flow');
  console.log('===============================\n');
  
  try {
    // Step 1: Test forgot password request
    console.log('Step 1: Testing forgot password request...');
    
    const forgotPasswordResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forgot-password',
        email: testEmail,
      }),
    });
    
    const forgotPasswordResult = await forgotPasswordResponse.json();
    
    console.log(`Status: ${forgotPasswordResponse.status}`);
    console.log('Response:', JSON.stringify(forgotPasswordResult, null, 2));
    
    if (forgotPasswordResult.success) {
      console.log('✅ Forgot password request successful\n');
    } else {
      console.log('❌ Forgot password request failed\n');
    }
    
    // Step 2: Test with invalid email format
    console.log('Step 2: Testing with invalid email format...');
    
    const invalidEmailResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forgot-password',
        email: 'invalid-email',
      }),
    });
    
    const invalidEmailResult = await invalidEmailResponse.json();
    
    console.log(`Status: ${invalidEmailResponse.status}`);
    console.log('Response:', JSON.stringify(invalidEmailResult, null, 2));
    
    // Should still return success for security reasons
    if (invalidEmailResult.success) {
      console.log('✅ Invalid email handled correctly (returns success for security)\n');
    } else {
      console.log('❌ Invalid email handling failed\n');
    }
    
    // Step 3: Test reset password with sample data
    console.log('Step 3: Testing reset password with sample data...');
    
    // Note: In a real scenario, you'd get these from the email link
    const sampleKey = 'sample-reset-key';
    const sampleLogin = 'testuser';
    const newPassword = 'NewPassword123!';
    
    const resetPasswordResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reset-password',
        key: sampleKey,
        login: sampleLogin,
        password: newPassword,
      }),
    });
    
    const resetPasswordResult = await resetPasswordResponse.json();
    
    console.log(`Status: ${resetPasswordResponse.status}`);
    console.log('Response:', JSON.stringify(resetPasswordResult, null, 2));
    
    if (resetPasswordResponse.status === 400) {
      console.log('✅ Reset password correctly rejects invalid key (expected behavior)\n');
    } else if (resetPasswordResult.success) {
      console.log('✅ Reset password successful\n');
    } else {
      console.log('❌ Reset password failed\n');
    }
    
    // Step 4: Test the frontend pages
    console.log('Step 4: Testing frontend page accessibility...');
    
    try {
      const forgotPasswordPageResponse = await fetch(`${BASE_URL}/forgot-password`);
      console.log(`Forgot password page status: ${forgotPasswordPageResponse.status}`);
      
      if (forgotPasswordPageResponse.status === 200) {
        console.log('✅ Forgot password page accessible');
      } else {
        console.log('❌ Forgot password page not accessible');
      }
      
      const resetPasswordPageResponse = await fetch(`${BASE_URL}/reset-password?key=test&login=test`);
      console.log(`Reset password page status: ${resetPasswordPageResponse.status}`);
      
      if (resetPasswordPageResponse.status === 200) {
        console.log('✅ Reset password page accessible');
      } else {
        console.log('❌ Reset password page not accessible');
      }
      
    } catch (pageError) {
      console.log('❌ Error testing frontend pages:', pageError.message);
    }
    
    console.log('\n🎉 Forgot Password Flow Testing Complete!');
    console.log('\nNext Steps:');
    console.log('1. Configure WordPress/WooCommerce to customize the password reset email template');
    console.log('2. Update the email template to point to your frontend URLs:');
    console.log('   - Forgot password: http://localhost:3000/forgot-password');
    console.log('   - Reset password: http://localhost:3000/reset-password?key={key}&login={login}');
    console.log('3. Test with a real WordPress user account');
    console.log('4. Verify email delivery works in your environment');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testForgotPasswordFlow();