const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// ================================
// 烬野智能店长 V1
// 第一阶段：AI 大脑 + 经营日报记忆
// ================================

const STORE_INFO = {
  name: '清真烬野·原味炭烤',
  location: '云南省昆明市嵩明县',
  businessHours: '17:30-03:30',
  area: '约100平方米',
  tables: 9,
  products: ['原味牛肉', '麻辣牛肉', '黑椒牛排', '酸菜牛肉', '傣味牛肉'],
  beefPrice: '128元/公斤',
  vegetablesPrice: '8元/人'
};

// V1 先使用内存保存日报，后续接数据库后会永久保存。
const dailyReports = [];

const STORE_MANAGER_PROMPT = `
你现在是“烬野智能店长”，负责帮助一家位于云南昆明嵩明县的清真炭烤鲜牛肉烧烤店经营。

【门店资料】
店名：${STORE_INFO.name}
地点：${STORE_INFO.location}
营业时间：${STORE_INFO.businessHours}
面积：${STORE_INFO.area}
桌数：${STORE_INFO.tables}
牛肉：${STORE_INFO.beefPrice}
蔬菜水果小吃：${STORE_INFO.vegetablesPrice}
特色：现切新鲜小黄牛，炭火烧烤，尽量保留牛肉本身的香味。
牛肉口味：${STORE_INFO.products.join('、')}。

【你的职责】
1. 分析营业额、桌数、人数、客单价、牛肉销量、新老客、抖音来源等经营数据。
2. 主动发现问题，不只是回答问题。
3. 给老板简单、直接、能马上执行的建议。
4. 如果数据不足，要明确告诉老板缺什么数据，不要编造。
5. 涉及抖音运营时，要结合门店实际情况给出短视频、团购、直播和活动建议。
6. 你是“店长”，说话要像一个懂餐饮经营的助手，少说空话。
7. 所有金额默认人民币。

【日报字段】
日期、营业额、桌数、人数、牛肉销量公斤、酒水收入、天气、新客桌数、老客桌数、抖音来源桌数、顾客反馈、当天视频/直播情况。

当老板问“今天怎么样”“最近生意怎么样”“有什么问题”等问题时，要优先结合已经记录的日报分析。
`;

function buildDailyContext() {
  if (dailyReports.length === 0) {
    return '\n目前还没有记录任何经营日报。';
  }

  return '\n【最近经营日报】\n' + dailyReports
    .slice(-30)
    .map((r) => JSON.stringify(r, null, 2))
    .join('\n');
}

// 欢迎页面
app.get('/', (req, res) => {
  res.json({
    name: '烬野智能店长',
    status: 'running',
    version: 'V1',
    message: '智能店长服务已启动',
    endpoints: {
      chat: 'POST /chat',
      dailyReport: 'POST /daily',
      reports: 'GET /daily'
    }
  });
});

// 查看门店资料
app.get('/store', (req, res) => {
  res.json(STORE_INFO);
});

// ================================
// 经营日报接口
// ================================
app.post('/daily', (req, res) => {
  const report = req.body;

  if (!report || !report.date) {
    return res.status(400).json({ error: '请至少提供 date 日期字段' });
  }

  const normalizedReport = {
    date: report.date,
    revenue: Number(report.revenue || 0),
    tables: Number(report.tables || 0),
    people: Number(report.people || 0),
    beefKg: Number(report.beefKg || 0),
    drinksRevenue: Number(report.drinksRevenue || 0),
    weather: report.weather || '',
    newCustomerTables: Number(report.newCustomerTables || 0),
    oldCustomerTables: Number(report.oldCustomerTables || 0),
    douyinTables: Number(report.douyinTables || 0),
    customerFeedback: report.customerFeedback || '',
    content: report.content || ''
  };

  const existingIndex = dailyReports.findIndex((r) => r.date === normalizedReport.date);
  if (existingIndex >= 0) {
    dailyReports[existingIndex] = normalizedReport;
  } else {
    dailyReports.push(normalizedReport);
  }

  res.json({ success: true, message: '经营日报已记录', report: normalizedReport });
});

app.get('/daily', (req, res) => {
  res.json({ count: dailyReports.length, reports: dailyReports });
});

// ================================
// AI 智能店长聊天接口
// ================================
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: '请提供 message 字段' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: '服务器还没有配置 OPENAI_API_KEY' });
  }

  try {
    const input = `${STORE_MANAGER_PROMPT}${buildDailyContext()}\n\n【老板的问题】\n${userMessage}`;

    // 使用 OpenAI Responses API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        input
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = openaiResponse.data.output_text ||
      openaiResponse.data.output?.flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text')
        .map(item => item.text)
        .join('\n') ||
      'AI 暂时没有返回文字结果。';

    // 如果配置了飞书 Webhook，则把对话同步到飞书
    if (process.env.FEISHU_WEBHOOK_URL) {
      try {
        await axios.post(process.env.FEISHU_WEBHOOK_URL, {
          msg_type: 'text',
          content: {
            text: `【烬野智能店长】\n老板：${userMessage}\n\n店长：${reply}`
          }
        });
      } catch (feishuError) {
        console.error('飞书通知失败：', feishuError.message);
      }
    }

    res.json({
      success: true,
      reply,
      store: STORE_INFO.name
    });
  } catch (error) {
    console.error('AI 请求失败：', error.response?.data || error.message);
    res.status(500).json({
      error: 'AI 处理失败',
      detail: error.response?.data?.error?.message || error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`烬野智能店长 V1 已启动，端口：${PORT}`);
});
