exports.getpagenotfound=(req,res,next)=>{
  
  res.render('error/404',{
    isLoggedIn:req.isLoggedIn,
    user:req.session.user,

  });
};