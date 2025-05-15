const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const User=require('../../models/userSchema')

const getPaymentFailure = async (req, res) => {
  try {
    const orderId = req.query.orderId;
  
    const orderData = await Order.findOne({ razorpayOrderId: orderId });
    res.render("paymentFailure", { order: orderData });
  } catch (error) {
    console.log('error in rendering payment failure',error);
    
  }
};

const getRetryPayment = async (req, res, next) => {
  try {
    const user = req.session.user;
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ razorpayOrderId: orderId });
    let wallet = await Wallet.findOne({ userId: user});
    if (!wallet) {
            wallet = new Wallet({ userId:user, balance: 0, transactions: [] });
          }
          
    res.render("retryPayment", { user, order: orderData, wallet });
  } catch (error) {
    next(error);
  }
};

module.exports={
   getPaymentFailure,
   getRetryPayment
}