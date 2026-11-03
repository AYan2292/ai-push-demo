const { saveSubscription } = require('./_lib');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subscription = req.body;
    await saveSubscription(subscription);
    res.status(201).json({ message: '订阅成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
