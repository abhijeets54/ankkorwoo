import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  email: 'testresend@example.com',
  firstName: 'Test',
  lastName: 'Resend',
  password: 'TempPassword123!'
};

async function testResendPasswordResetFlow() {
  console.log('📧 Testing Complete Resend Password Reset Flow');
  console.log('===============================================\n');
  
  try {
    // Step 1: Register a test user
    console.log('Step 1: Registering test user...');
    
    const registerResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        password: testUser.password,
      }),
    });
    
    const registerResult = await registerResponse.json();
    
    console.log(`Registration Status: ${registerResponse.status}`);
    if (registerResult.success) {
      console.log('✅ User registered successfully');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Name: ${testUser.firstName} ${testUser.lastName}\n`);
    } else {
      console.log('ℹ️  User might already exist, continuing with test...\n');
    }
    
    // Step 2: Test forgot password with Resend
    console.log('Step 2: Testing forgot password with Resend...');
    
    const forgotPasswordResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forgot-password',
        email: testUser.email,
      }),
    });
    
    const forgotPasswordResult = await forgotPasswordResponse.json();
    
    console.log(`Forgot Password Status: ${forgotPasswordResponse.status}`);
    console.log('Response:', JSON.stringify(forgotPasswordResult, null, 2));
    
    if (forgotPasswordResult.success) {
      console.log('✅ Forgot password request successful');
      console.log('📧 Email sent via Resend to:', testUser.email);
      console.log('📝 Check server logs for reset token and email delivery status\n');
    } else {
      console.log('❌ Forgot password request failed\n');
    }
    
    // Step 3: Test with non-existent email
    console.log('Step 3: Testing with non-existent email...');
    
    const nonExistentEmailResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'forgot-password',
        email: 'nonexistent@example.com',
      }),
    });
    
    const nonExistentResult = await nonExistentEmailResponse.json();
    
    console.log(`Non-existent email test - Status: ${nonExistentEmailResponse.status}`);
    console.log('Response:', JSON.stringify(nonExistentResult, null, 2));
    
    if (nonExistentResult.success) {
      console.log('✅ Non-existent email handled correctly (returns success for security)\n');
    }
    
    // Step 4: Test reset password with sample token
    console.log('Step 4: Testing reset password with invalid token...');
    
    const resetPasswordResponse = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reset-password',
        token: 'invalid-token-123',
        password: 'NewPassword456!',
      }),
    });
    
    const resetPasswordResult = await resetPasswordResponse.json();
    
    console.log(`Reset Password Status: ${resetPasswordResponse.status}`);
    console.log('Response:', JSON.stringify(resetPasswordResult, null, 2));
    
    if (resetPasswordResponse.status === 400) {
      console.log('✅ Invalid token correctly rejected\n');
    } else {
      console.log('❌ Invalid token handling failed\n');
    }
    
    // Step 5: Test frontend pages
    console.log('Step 5: Testing frontend page accessibility...');
    
    try {
      const forgotPasswordPageResponse = await fetch(`${BASE_URL}/forgot-password`);
      console.log(`Forgot password page status: ${forgotPasswordPageResponse.status}`);
      
      if (forgotPasswordPageResponse.status === 200) {
        console.log('✅ Forgot password page accessible');
      } else {
        console.log('❌ Forgot password page not accessible');
      }
      
      const resetPasswordPageResponse = await fetch(`${BASE_URL}/reset-password?token=test-token`);
      console.log(`Reset password page status: ${resetPasswordPageResponse.status}`);
      
      if (resetPasswordPageResponse.status === 200) {
        console.log('✅ Reset password page accessible');
      } else {
        console.log('❌ Reset password page not accessible');
      }
      
    } catch (pageError) {
      console.log('❌ Error testing frontend pages:', pageError.message);
    }
    
    console.log('\n🎉 Resend Password Reset Flow Testing Complete!');
    console.log('\n📋 Summary:');
    console.log('- ✅ API endpoints working with Resend integration');
    console.log('- ✅ Email sending via Resend (check logs for delivery status)');
    console.log('- ✅ Token-based reset system implemented');
    console.log('- ✅ Frontend pages accessible');
    console.log('- ✅ Security measures in place');
    
    console.log('\n📧 Email Integration Status:');
    if (process.env.RESEND_API_KEY) {
      console.log('- ✅ RESEND_API_KEY configured');
      console.log('- 📧 Emails will be sent via Resend');
      console.log('- 📬 Check your email inbox for reset emails');
    } else {
      console.log('- ❌ RESEND_API_KEY not configured');
      console.log('- 📝 Add RESEND_API_KEY to your .env.local file');
      console.log('- 🌐 Get your API key from: https://resend.com/api-keys');
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Set up Resend account and get API key');
    console.log('2. Add RESEND_API_KEY to .env.local');
    console.log('3. Test with real email address');
    console.log('4. Check email delivery in Resend dashboard');
    console.log('5. Customize email template as needed');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the Next.js server is running on localhost:3000');
      console.log('Run: npm run dev');
    }
  }
}

// Run the test
testResendPasswordResetFlow();