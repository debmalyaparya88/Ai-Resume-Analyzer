require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());


const userrouter = require("./routers/user");
const authrouter = require("./routers/auth"); 
const errors=require("./controllers/error.js");// adjust the path if needed
const {default:mongoose}=require('mongoose');


const session=require('express-session');
const mongostore=require('connect-mongodb-session')(session);

app.set("view engine", "ejs");
app.set("views",  "views");

const store = new mongostore({
  uri: process.env.MONGODB_URI,
  collection: "session"
});

// app.use((req,res,next)=>{
//   console.log("Content-Type:", req.headers['content-type']);
//   next();
// });
const multer=require('multer');
const randomString = (length) => {
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyz';

  let result = '';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return result;
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, randomString(10) + '-' + file.originalname);
  }
});
const multeroption={
  storage
}
app.use(express.urlencoded({ extended: true }));
app.use(multer(multeroption).single('resume'));

app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));



app.use(session({
  secret: process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  store:store,

}));

app.use(express.static(path.join(__dirname, "public")));
app.use((req,res,next)=>{
  
   req.isLoggedIn = req.session.isLoggedIn;
  
  console.log("isLoggedIn:", req.isLoggedIn);
  next();
});
app.use(userrouter);
app.use(authrouter);

app.use((req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    next();
});

app.use(errors.getpagenotfound);


const port=3002;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    app.listen(process.env.PORT || 3002, () => {
      console.log("Server started");
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
  });