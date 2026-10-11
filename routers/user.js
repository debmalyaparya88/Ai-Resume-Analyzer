

const express=require('express');
const userrouter=express.Router();

const homescontroller=require("../controllers/userc");

console.log("homescontroller =", homescontroller);


userrouter.get("/",homescontroller.getfont);
userrouter.get("/about",homescontroller.getabout);
userrouter.get("/features",homescontroller.getfeatures);
userrouter.get("/analyze",homescontroller.getanalyze);
userrouter.post("/analyze",homescontroller.postanalyze);
userrouter.get('/interview-questions', homescontroller.getInterviewQuestionsForm);
userrouter.post('/interview-questions', homescontroller.postInterviewQuestions);
userrouter.get('/chatbot', homescontroller.getChatbot);
userrouter.post('/chatbot/message', homescontroller.postChatbotMessage);
userrouter.post('/chatbot/reset', homescontroller.postChatbotReset);
module.exports = userrouter;