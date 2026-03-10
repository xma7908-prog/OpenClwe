# OpenClaw 一键部署版

本项目是一个简单的 Node.js 服务，接入 OpenAI 大模型和飞书机器人，支持一键部署到 Vercel 或 Railway。

## 一键部署

点击下方按钮，即可快速部署到云平台，并配置环境变量。

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fxma7908-prog%2FOpenClwe&env=OPENAI_API_KEY,FEISHU_WEBHOOK_URL&envDescription=%E8%AF%B7%E8%BE%93%E5%85%A5%E6%82%A8%E7%9A%84%20OpenAI%20API%20Key%20%E5%92%8C%20%E9%A3%9E%E4%B9%A6%20Webhook%20%E5%9C%B0%E5%9D%80&project-name=openclaw&repository-name=OpenClwe)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?template=https%3A%2F%2Fgithub.com%2Fxma7908-prog%2FOpenClwe&envs=OPENAI_API_KEY,FEISHU_WEBHOOK_URL)

## 使用说明

部署完成后，您会获得一个公网 URL，可以通过 `POST /chat` 接口发送消息：

```bash
curl -X POST https://你的域名/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
