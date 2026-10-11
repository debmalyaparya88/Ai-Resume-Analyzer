

const express=require('express');
const authrouter=express.Router();

const logincontroller=require("../controllers/authc");

console.log("homescontroller =", logincontroller);


authrouter.get("/login",logincontroller.getlogin);
authrouter.post("/login",logincontroller.postlogin);
authrouter.post("/logout",logincontroller.postlogout);
authrouter.get("/signup",logincontroller.getsignup);
authrouter.post("/signup",logincontroller.postsignup);

module.exports=authrouter;