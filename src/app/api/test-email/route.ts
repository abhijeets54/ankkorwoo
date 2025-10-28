import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'orders@ankkor.in',
      to: 'your-test-email@example.com', // Change this to your email
      subject: 'Ankkor Email System Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c2c27;">Ankkor Email System Test</h1>
          <p style="color: #5c5c52;">
            This is a test email from the Ankkor email system using Resend with your verified domain.
          </p>
          <div style="margin-top: 20px; padding: 20px; background-color: #f4f3f0; border-left: 4px solid #8a8778;">
            <p style="margin: 0; color: #2c2c27;">
              If you received this email, your email system is working correctly!
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Email sending failed:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: data?.id },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}