const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 简单的欢迎页面
app.get('/', (req, res) => {
  res.send('OpenClaw 服务已启动！请使用 POST /chat 发送消息。');
});

// 聊天接口
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: '请提供 message 字段' });
  }

  try {
    // 调用大模型（以 OpenAI 为例）
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = openaiResponse.data.choices[0].message.content;

    // 如果配置了飞书 Webhook，发送通知
    if (process.env.FEISHU_WEBHOOK_URL) {
      await axios.post(process.env.FEISHU_WEBHOOK_URL, {
        msg_type: 'text',
        content: { text: `收到新消息：${userMessage}\nAI回复：${reply}` },
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '处理失败', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
});
