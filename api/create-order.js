const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TfAf7qGYdufUJ4",
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Add key secret in Vercel environment variables
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, currency, receipt } = req.body;

    const options = {
      amount, // Amount in paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ error: error.message || "Failed to create order" });
  }
}