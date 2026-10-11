const User=require("../models/login");
const { check, validationResult } = require('express-validator');
const bcrypt=require('bcryptjs');

exports.getlogin=(req, res) => {
  res.render("auth/login",{
    isLoggedIn:false,
    

  });
  
 
};

exports.postlogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(422).render("auth/login", {
      isLoggedIn: false,
      errors: ["User does not exist"],
      oldInput: { email },
    
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(422).render("auth/login", {
      isLoggedIn: false,
      errors: ["Incorrect password"],
      oldInput: { email },
  
    });
  }

  req.session.isLoggedIn = true;
  req.session.user = {
    _id: user._id.toString(),
    firstName: user.firstName,
    email: user.email,
    
  };

  console.log("Saving user:", req.session.user);

  req.session.save((err) => {
    if (err) {
      console.log(err);
      return res.redirect("/login");
    }

    res.redirect("/");
  });
};
exports.postlogout=(req, res,next) => {
 
  req.session.destroy(()=>{
    res.redirect("/login");

  });
 
};
exports.getsignup = (req, res) => {
  res.render("auth/signup", {
    isLoggedIn: false,
    errorMessages: [],
    oldInput: {},
    
  });
};
// exports.postsignup = (req, res) => {
//   const {
//     firstName,
//     lastName,
//     email,
//     password,
//     confirmPassword,
//     userType
//   } = req.body;

//   const user = new User({
//     firstname: firstName,
//     lastname: lastName,
//     email: email,
//     password: password,
//     confirmpassword: confirmPassword,
//     usertype: userType
//   });

//   user.save()
//     .then(result => {
//       console.log("User saved successfully", result);
//       res.render("auth/login", { isLoggedIn: false });
//     })
//     .catch(err => {
//       console.log("Save error:", err);
//     });
// };

exports.postsignup=[

  // First Name validation
  check('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters'),

  // Last Name validation
  check('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ min: 2})
    .withMessage('Last name must be at least 2 characters long')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters'),

  // Email validation
  check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  // Password validation
  check('password')
    .isLength({ min: 2 })
    .withMessage('Password must be at least 2 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),

  // Confirm Password validation
  // check('confirm_password')
  //   .trim()
  //   .custom((value, { req }) => {
  //     if (value !== req.body.password) {
  //       throw new Error('Passwords do not match');
  //     }
  //     return true;
  //   }),

 
    

  (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  console.log(req.body);

  const errors = validationResult(req);
  console.log("Before validation");
  

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      pageTitle: 'Sign Up',
      isLoggedIn: false,
      errorMessages: errors.array().map(error => error.msg),
      
      oldInput: {
        firstName,
        lastName,
        email,
        password,
       
      },
    
    });
  }
  bcrypt.hash(password,12)
  .then(hashedpassword=>{
    const user=new User({firstName,lastName,email,password:hashedpassword});
    return user.save();
  })
  .then(()=>{
    res.redirect("/login");
  }).catch(err=>{
    return res.status(422).render('auth/signup', {
      pageTitle: 'Sign Up',
      isLoggedIn: false,
      errorMessages:[err.message],
      oldInput:{firstName,lastName,email},
      

  });
});
  

}];   