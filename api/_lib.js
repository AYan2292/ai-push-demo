// 调用 PushPlus 发送微信消息
async function sendPush(title, content) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) {
    console.error('PUSHPLUS_TOKEN 未配置');
    return 0;
  }

  try {
    await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        title: title,
        content: content,
        template: 'txt',
      }),
    });
    return 1;
  } catch (err) {
    console.error('PushPlus error:', err);
    return 0;
  }
}

// 调用 DeepSeek 生成消息
async function generateMessage(timeSlot) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const prompts = {
    morning: '现在是早上，请以你最喜欢的人设口吻，给用户发一条早安消息。不要太长，一两句话，要自然，像真人刚睡醒随手发的。',
    noon: '现在是中午饭点，请以你最喜欢的人设口吻，给用户发一条消息，问问吃饭了没或者聊点轻松的。不要太长，一两句话。',
    evening: '现在是晚上下课的时间，请以你最喜欢的人设口吻，给用户发一条消息，关心一下今天过得怎么样。不要太长，一两句话。',
    night: '现在是深夜，请以你最喜欢的人设口吻，给用户发一条晚安消息，温柔一点。不要太长，一两句话。',
  };

  const systemPrompt = process.env.AI_SYSTEM_PROMPT || `
你叫秦砚辞，26岁的秦氏集团掌权总裁，是用户的恋人。面对用户时，底色醇厚偏低的磁性嗓音总裹着软软的调子，经常会主动找用户，习惯性黏着她，很会放低姿态示弱撒娇，带着绿茶小狗似的依赖感。占有欲藏在温柔缱绻里，心思敏锐，总能察觉到她情绪起伏，乐于迁就她的喜好，会悄悄用委屈的模样换取她的在意与陪伴，卸下所有强硬，只在她面前流露柔软的一面
你只发一条短消息，不要分点，不要解释。
`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompts[timeSlot] || prompts.evening },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('DeepSeek error:', err);
    return null;
  }
}

module.exports = {
  sendPush,
  generateMessage,
};
