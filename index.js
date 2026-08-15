const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const STORE_INFO={name:'清真烬野·原味炭烤',location:'云南省昆明市嵩明县',businessHours:'17:30-03:30',area:'约100平方米',tables:9,products:['原味牛肉','麻辣牛肉','黑椒牛排','酸菜牛肉','傣味牛肉'],beefPrice:'128元/公斤',vegetablesPrice:'8元/人'};
const dailyReports=[];
const STORE_MANAGER_PROMPT=`你是“烬野智能店长”，负责帮助云南昆明嵩明县的清真炭烤鲜牛肉烧烤店经营。门店：${STORE_INFO.name}；营业时间：${STORE_INFO.businessHours}；9桌；现切新鲜小黄牛；牛肉128元/公斤；蔬菜水果小吃8元/人；口味：${STORE_INFO.products.join('、')}。分析营业额、桌数、人数、客单价、牛肉销量、新老客、抖音来源和反馈；主动发现问题；给老板简单、直接、能执行的建议；数据不足就说明，不编造。`;
function dailyContext(){return dailyReports.length?'\n最近日报：\n'+dailyReports.slice(-30).map(r=>JSON.stringify(r)).join('\n'):'\n目前没有日报。';}
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/store',(req,res)=>res.json(STORE_INFO));
app.post('/daily',(req,res)=>{const r=req.body;if(!r?.date)return res.status(400).json({error:'请提供 date'});const report={date:r.date,revenue:Number(r.revenue||0),tables:Number(r.tables||0),people:Number(r.people||0),beefKg:Number(r.beefKg||0),drinksRevenue:Number(r.drinksRevenue||0),weather:r.weather||'',newCustomerTables:Number(r.newCustomerTables||0),oldCustomerTables:Number(r.oldCustomerTables||0),douyinTables:Number(r.douyinTables||0),customerFeedback:r.customerFeedback||'',content:r.content||''};const i=dailyReports.findIndex(x=>x.date===report.date);i>=0?dailyReports[i]=report:dailyReports.push(report);res.json({success:true,report});});
app.get('/daily',(req,res)=>res.json({count:dailyReports.length,reports:dailyReports}));
app.post('/chat',async(req,res)=>{const userMessage=req.body?.message;if(!userMessage)return res.status(400).json({error:'请提供 message'});if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'缺少 OPENAI_API_KEY，请在 Vercel 环境变量中配置'});const model=process.env.OPENAI_MODEL||'gpt-5.6';try{const r=await axios.post('https://api.openai.com/v1/responses',{model,input:`${STORE_MANAGER_PROMPT}${dailyContext()}\n老板的问题：${userMessage}`},{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},timeout:30000});const reply=r.data.output_text||r.data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'AI 没有返回文字。';res.json({success:true,reply,model});}catch(error){const status=error.response?.status;const apiError=error.response?.data?.error;console.error('OpenAI error',status,apiError||error.message);let detail=apiError?.message||error.message; if(status===401)detail='OPENAI_API_KEY 无效或已失效'; else if(status===403)detail='API Key 没有权限调用该模型'; else if(status===404)detail=`模型 ${model} 不存在或当前 API 不支持`; else if(status===429)detail='API 请求受限：可能是额度不足、限流或账户未开通 API 计费';res.status(500).json({error:'AI 处理失败',detail,status:status||500,model});}});
const PORT=process.env.PORT||3000;app.listen(PORT,()=>console.log(`烬野智能店长 V1 已启动，端口：${PORT}`));
