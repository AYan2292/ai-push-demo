const { generateMessage, sendPush } = require('./_lib');

export default async function handler(req, res) {
  // Vercel Cron 会带这个 header 来验证
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 根据当前时间判断发什么消息
    const hour = new Date().getHours();
    let timeSlot;

    if (hour >= 6 && hour < 11) timeSlot = 'morning';
    else if (hour >= 11 && hour < 14) timeSlot = 'noon';
    else if (hour >= 17 && hour < 21) timeSlot = 'evening';
    else if (hour >= 22 || hour < 1) timeSlot = 'night';
    else return res.json({ message: '现在不是发消息的时间，跳过' });

    console.log('触发定时任务:', timeSlot);
    const msg = await generateMessage(timeSlot);

    if (msg) {
      const sent = await sendPush('💌 来自ta', msg);
      return res.json({ success: true, timeSlot, sent, message: msg });
    } else {
      return res.json({ success: false, message: '生成消息失败' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
