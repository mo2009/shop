import { NextResponse } from 'next/server';
import sendgrid from '@sendgrid/mail';

// Ensure the API key is set via environment variable
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not configured');
}
sendgrid.setApiKey(SENDGRID_API_KEY || '');

type RequestBody = {
  orderId: string;
  userEmail: string;
  newStatus: string;
  userName?: string;
};

export async function POST(req: Request) {
  try {
    const { orderId, userEmail, newStatus, userName } = (await req.json()) as RequestBody;
    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@yourdomain.com',
      subject: `Your order ${orderId} status updated`,
      html: `<p>Hi${userName ? ' ' + userName : ''},</p>
        <p>Your order <strong>${orderId}</strong> status has been updated to <strong>${newStatus}</strong>.</p>
        <p>Thank you for shopping with us!</p>`,
    };
    await sendgrid.send(msg);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SendGrid error:', error);
    return NextResponse.json({ success: false, error: (error as any).toString() }, { status: 500 });
  }
}
