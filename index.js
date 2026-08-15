const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const STORE_INFO = {
  name: '清真烬野·原味炭烤', location: '云南省昆明市嵩明县', businessHours: '17:30-03:30',
  area: '约100平方米', tables: 9, products: ['原味牛肉','麻辣牛肉','黑椒牛排','酸菜牛肉','傣味牛肉'],
  beefPrice: '128元/公斤', vegetablesPrice: '8元/人'
};
const dailyReports = [];
const STORE_MANAGER_PROMPT = `你现在是“烬野智能店长”，负责帮助一家位于云南昆明嵩明县的清真炭烤鲜牛肉烧烤店经营。
门店：${STORE_INFO.name}；营业时间：${STORE_INFO.businessHours}；9桌；现切新鲜小黄牛；牛肉128元/公斤；蔬菜水果小吃8元/人；口味：${STORE_INFO.products.join('、')}。
你的职责：分析营业额、桌数、人数、客单价、牛肉销量、新老客、抖音来源和顾客反馈；主动发现问题；给老板简单、直接、马上能执行的建议；数据不足时明确说明，不编造；涉及抖音时结合门店实际给短视频、团购、直播建议。说话像懂餐饮经营的店长，少空话。所有金额默认人民币。`;
function buildDailyContext(){return dailyReports.length?'\n最近经营日报：\n'+dailyReports.slice(-30).map(r=>JSON.stringify(r)).join('\n'):'\n目前还没有经营日报。';}

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/store',(req,res)=>res.json(STORE_INFO));
app.post('/daily',(req,res)=>{
  const r=req.body;if(!r||!r.date)return res.status(400).json({error:'请提供 date 日期字段'});
  const report={date:r.date,revenue:Number(r.revenue||0),tables:Number(r.tables||0),people:Number(r.people||0),beefKg:Number(r.beefKg||0),drinksRevenue:Number(r.drinksRevenue||0),weather:r.weather||'',newCustomerTables:Number(r.newCustomerTables||0),oldCustomerTables:Number(r.oldCustomerTables||0),douyinTables:Number(r.douyinTables||0),customerFeedback:r.customerFeedback||'',content:r.content||''};
  const i=dailyReports.findIndex(x=>x.date===report.date);if(i>=0)dailyReports[i]=report;else dailyReports.push(report);res.json({success:true,message:'经营日报已记录',report});
});
app.get('/daily',(req,res)=>res.json({count:dailyReports.length,reports:dailyReports}));
app.post('/chat',async(req,res)=>{
  const userMessage=req.body.message;if(!userMessage)return res.status(400).json({error:'请提供 message 字段'});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'服务器还没有配置 OPENAI_API_KEY'});
  try{
    const response=await axios.post('https://api.openai.com/v1/responses',{model:process.env.OPENAI_MODEL||'gpt-5.6',input:`${STORE_MANAGER_PROMPT}${buildDailyContext()}\n老板的问题：${userMessage}`},{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'}});
    const reply=response.data.output_text||response.data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'AI 暂时没有返回文字结果。';
    if(process.env.FEISHU_WEBHOOK_URL){try{await axios.post(process.env.FEISHU_WEBHOOK_URL,{msg_type:'text',content:{text:`【烬野智能店长】\n老板：${userMessage}\n\n店长：${reply}`}})}catch(e){console.error('飞书通知失败：',e.message)}}
    res.json({success:true,reply,store:STORE_INFO.name});
  }catch(error){console.error('AI 请求失败：',error.response?.data||error.message);res.status(500).json({error:'AI 处理失败',detail:error.response?.data?.error?.message||error.message});}
});
const PORT=process.env.PORT||3000;app.listen(PORT,()=>console.log(`烬野智能店长 V1 已启动，端口：${PORT}`));
