import twilio from 'twilio';
import axios from 'axios';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function testOptOutWebhook() {
  // Simulate a Twilio webhook request
  const response = await axios.post(
    'https://yourdomain.com/sms/opt-out',
    {
      From: '+15551234567', // Test phone number
      Body: 'STOP'
    },
    {
      headers: {
        'x-twilio-signature': '...' // Generate this properly in a real test
      }
    }
  );
  console.log('Webhook response:', response.status);
}

testOptOutWebhook();