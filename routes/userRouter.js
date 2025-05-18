const express=require('express')
const router=express.Router()
const passport=require('passport')
const userController=require('../controllers/user/userController')
const profileController=require('../controllers/user/profileController')
const productController=require('../controllers/user/productController')
const wishlistController=require('../controllers/user/wishlistController')
const cartController=require('../controllers/user/cartController')
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const walletController=require('../controllers/user/walletController')
const retryPaymentController=require('../controllers/user/retryPaymentController')
const {userAuth,adminAuth}=require('../middleware/auth')
const multer = require('multer')
const storage=require('../helpers/multer')
const uploads=multer({storage:storage})


//signup management
router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signUp)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)

//google auth
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
 
  req.session.user=req.user._id
  res.redirect('/')  
})

//login management
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

// shopping
router.get('/shop',userAuth,userController.loadShoppingPage)
router.get('/filter',userAuth,userController.filterProduct)
router.get('/filterPrice',userAuth,userController.filterByPrice)
router.post('/search',userAuth,userController.searchProducts)


//profile management
router.get('/forgotPassword',profileController.getForgotPassPage)
router.post('/forgot-email-valid',profileController.forgotEmailvalid)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/change-email',userAuth,profileController.changeEmail)
router.post('/change-email',userAuth,profileController.changeEmailvalid)
router.post('/verify-email-otp',userAuth,profileController.verifyEmailOtp)
router.post('/update-email',userAuth,profileController.updateEmail)
router.get('/change-password',userAuth,profileController.changePassword)
router.post('/change-password',userAuth,profileController.changePasswordValid)
router.post('/verify-changePassword-otp',userAuth,profileController.verifyChangePassOtp)
router.post('/resend-changepassword-otp',userAuth,profileController.resendChangePasswordOtp)
router.post('/uploadProfile',userAuth,uploads.single('profileImage'),profileController.uploadProfile);


//address management
router.get('/userAddress',userAuth,profileController.userAddress)
router.get('/addAddress',userAuth,profileController.addAddress)
router.post('/addAddress',userAuth,profileController.postAddAddress)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.postEditAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)


//product management
router.get('/productDetails',userAuth,productController.productDetails)

//wishlist management
router.get('/wishlist',userAuth,wishlistController.getwishlist)
router.post('/addToWishlist',userAuth,wishlistController.addToWishlist)
router.delete('/wishlist/remove/:productId',userAuth,wishlistController.removeWishlist)
router.post('/add/:id', userAuth, wishlistController.addCartFromWishlist)

//cart management
router.get('/cart',userAuth,cartController.getCart)
router.post('/addToCart',userAuth, cartController.addToCart);
router.post('/cart/remove',userAuth,cartController.removeItemFromCart);
router.post('/cart/update-quantity',userAuth,cartController.updateCartQuantity);

//checkout management
router.get('/checkout',userAuth,checkoutController.getCheckout)
router.post('/applyCoupon',userAuth,checkoutController.applyCoupon)
router.delete('/removeCoupon',userAuth,checkoutController.removeCoupon)

//order managemnet
router.get('/userOrder',userAuth,orderController.userOrder)
router.post('/placeOrder',userAuth,orderController.placeOrder)
router.post('/placeWalletOrder',userAuth,orderController.placeWalletOrder)
router.get('/orderDetails',userAuth,orderController.getOrderDetails)
router.get('/getInvoice',userAuth,orderController.getInvoice)
router.put('/cancelOrder',userAuth,orderController.cancelOrder)
router.post('/return', userAuth, uploads.array('images', 3), orderController.requestReturn);
router.put('/cancelReturnRequest',userAuth,orderController.cancelReturnRequest)
router.get('/confirmation',userAuth,orderController.loadConfirmation);
router.put('/cancelProduct',userAuth,orderController.cancelProduct)

//razorpay management
router.post("/order/createOrder",userAuth,orderController.createOrder)
router.post("/order/verifyPayment",userAuth,orderController.verifyPayment);

//wallet management
router.get('/wallet',userAuth,walletController.getWallet)
router.post("/wallet/createOrder",userAuth, walletController.createOrder);
router.post("/wallet/verifyPayment",userAuth, walletController.verifyPayment);
router.put("/wallet/withdrawMoney",userAuth,walletController.withdrawMoney);

//retry payment management
router.get("/paymentFailure",userAuth,retryPaymentController.getPaymentFailure)
router.get('/retryPayment',userAuth,retryPaymentController.getRetryPayment)
router.put('/retryPayment/cod',userAuth,retryPaymentController.retryPaymentCod)
router.put('/retryPayment/wallet',userAuth,retryPaymentController.retryPaymentWallet)
router.post('/retryPayment/razorpay',userAuth,retryPaymentController.retryPaymentRazorpay)



module.exports=router