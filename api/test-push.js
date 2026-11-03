const { sendPush } = require('./_lib');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sent = await sendPush('测试消息 🎉', '这是一条来自AI的测试推送，成功啦！');
    res.json({ success: true, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
