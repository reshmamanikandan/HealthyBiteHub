const Razorpay = require("razorpay");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_Th5HlOrB0CSs8p",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "6ynYFwliu3XikR6DkUfVLeTh",
    });

    const { amount, currency = "INR", receipt } = req.body;

    const order = await instance.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return res.status(500).json({ error: error.message || "Failed to create order" });
  }
}