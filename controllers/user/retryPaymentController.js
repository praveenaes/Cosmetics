const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const StatusCodes=require('../../helpers/statusCodes')
const Messages=require('../../helpers/messages')
const razorpay=require('../../config/razorpay')

const getPaymentFailure = async (req, res) => {
  try {
    const orderId = req.query.orderId;
  
    const orderData = await Order.findOne({ razorpayOrderId: orderId });
    res.render("paymentFailure", { order: orderData });
  } catch (error) {
    console.log('error in rendering payment failure',error);
    
  }
};

const getRetryPayment = async (req, res) => {
  try {
    const user = req.session.user;
    const userData=await User.findById(user)
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ razorpayOrderId: orderId });
   
    
    let wallet = await Wallet.findOne({ userId: user});
    if (!wallet) {
            wallet = new Wallet({ userId:user, balance: 0, transactions: [] });
          }
          
    res.render("retryPayment", { user:userData, order: orderData, wallet });
  } catch (error) {
    console.log('error in getretryPayment',error);
    
  }
};

const retryPaymentCod = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId: orderId });

    if (orderData.finalAmount > 1000) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: Messages.COD_LIMIT_EXCEEDED });
    }

    const orderedItems = orderData.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));
    
    for (let item of orderedItems) {
      const product = await Product.findById(item.product._id);
      if (!product || product.quantity < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: Messages.INSUFFICIENT_STOCK(product?.productName || 'Unknown', product.quantity),
        });        
      }
    }
    
for (let item of orderedItems) {
      const product = await Product.findById(item.product._id);
      if ( product.isBlocked ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: Messages.PRODUCT_BLOCKED(product?.productName || 'Unknown', product.quantity),
        });        
      }
    }


    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    const updateOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Pending",
          paymentMethod: "cod",
        },
      }
    );

    if (updateOrder) {
      return res
        .status(StatusCodes.SUCCESS)
        .json({ success: true, message: Messages.PAYMENT_SUCCESSFUL });
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: true, message: Messages.PAYMENT_FAILED });
    }
  } catch (error) {
    next(error);
  }
};

const retryPaymentWallet = async (req, res) => {
  try {
    const userId = req.session.user
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId: orderId });
    const userData = await User.findById(userId);

    let wallet = await Wallet.findOne({ userId: userId });
    const finalAmount = orderData.finalAmount;
    const orderedItems = orderData.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));


    for (let item of orderedItems) {
      const product = await Product.findById(item.product._id);
      if (!product || product.quantity < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: Messages.INSUFFICIENT_STOCK(product?.productName || 'Unknown', product.quantity),
        });        
      }
    }
  
for (let item of orderedItems) {
      const product = await Product.findById(item.product._id);
      if ( product.isBlocked ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: Messages.PRODUCT_BLOCKED(product?.productName || 'Unknown', product.quantity),
        });        
      }
    }


    if (wallet.balance < finalAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.INSUFFICIENT_WALLET_BALANCE(wallet.balance),
      });
    }

    if (!wallet) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.WALLET_NOT_FOUND,
      });
    }

    wallet.balance -= parseInt(finalAmount);
    wallet.transactions.push({
      amount: finalAmount,
      type: "debit",
      description: "Deducted for purchase",
      orderId: orderData._id,
    });
    await wallet.save();

    

    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    const updateOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Success",
          paymentMethod: "wallet",
        },
      }
    );

    if (updateOrder) {
      return res
        .status(StatusCodes.SUCCESS)
        .json({ success: true, message: Messages.PAYMENT_SUCCESSFUL });
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: true, message: Messages.PAYMENT_FAILED });
    }
  } catch (error) {
    console.log('error in retryPaymentWallet',error);
    
  }
};

const retryPaymentRazorpay = async (req, res) => {
    try {
      const userId = req.session.user
      const { orderId } = req.body;
  
      const orderData = await Order.findOne({ orderId: orderId });
      const orderedItems = orderData.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));
  
      const options = {
        amount: orderData.finalAmount * 100,
        currency: "INR",
        receipt: `txn_${Date.now()}`,
      };
  
      const order = await razorpay.orders.create(options);
  
     for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }


    
      await Order.findOneAndUpdate(
        { orderId },
        { $set: { razorpayOrderId: order.id,status: "Processing",
          paymentStatus: "Success",
          paymentMethod: "online payment", } }
      );
  
      res.status(200).json({
        id: order.id,
        amount: options.amount,
        currency: options.currency,
        orderId: orderData.orderId,
      });
    } catch (error) {
      console.log('error in retrypayment razorpay',error);
      
    }
  };
  

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false });
    }

    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Processing", paymentStatus: "Success" } }
    );

    const orderedItems = order.orderedItems;
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    res.status(StatusCodes.SUCCESS).json({
      success: true,
      message: Messages.PAYMENT_SUCCESSFUL,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false });
  }
};


module.exports={
   getPaymentFailure,
   getRetryPayment,
   retryPaymentCod,
   retryPaymentWallet,
   retryPaymentRazorpay,
   verifyPayment
}