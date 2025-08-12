import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('🔧 Testing Resend API Direct');
console.log('============================\n');

console.log('API Key:', process.env.RESEND_API_KEY ? 'Found' : 'Missing');
console.log('Testing with delivered@resend.dev (Resend test email)\n');

async function testResendAPI() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Ankkor <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Test Email from Ankkor',
      html: '<h1>Hello World</h1><p>This is a test email to verify Resend API is working.</p>',
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      return false;
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Email ID:', data.id);
      return true;
    }
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
}

// Test with your actual email
async function testWithYourEmail() {
  try {
    console.log('\nTesting with your email: as9184635@gmail.com');
    
    const { data, error } = await resend.emails.send({
      from: 'Ankkor <onboarding@resend.dev>',
      to: ['as9184635@gmail.com'],
      subject: 'Password Reset Test - Ankkor',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Test</h1>
          <p>This is a test email to verify Resend API is working with your email address.</p>
          <p>If you receive this email, the Resend integration is working correctly!</p>
          <p>Time sent: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend API Error for your email:', error);
      return false;
    } else {
      console.log('✅ Test email sent to your address!');
      console.log('Email ID:', data.id);
      console.log('📧 Check your inbox and spam folder');
      return true;
    }
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
}

// Run tests
const testResult = await testResendAPI();
if (testResult) {
  await testWithYourEmail();
}