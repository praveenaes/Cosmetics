const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const StatusCodes  = require('../../helpers/statusCodes');
const Wallet=require('../../models/walletSchema')
const Coupon=require('../../models/couponSchema')
const razorpay = require("../../config/razorpay");
const Messages=require('../../helpers/messages')
const crypto=require('crypto')

const userOrder = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      console.log('User not logged in');
      return res.redirect('/login');
    }

    const query = req.query.query || ''; 
    const page = parseInt(req.query.page) || 1; 
    const ordersPerPage = 4;  
    const skip = (page - 1) * ordersPerPage;  

    const userData = await User.findById(userId);

    const searchCondition = { userId };

    if (query) {
      searchCondition.orderId = { $regex: query, $options: 'i' };
    }

   
    const orders = await Order.find(searchCondition)
      .skip(skip)
      .limit(ordersPerPage)
      .sort({ createdOn: -1 });

   
    const totalOrders = await Order.countDocuments(searchCondition);
    const totalPages = Math.ceil(totalOrders / ordersPerPage); 

    res.render('userOrder', {
      user: userData,
      orders,
      query,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.log('Error in rendering order page:', error.message);
    res.status(500).send('Server error');
  }
};

const generateOrderId = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const dateString = `${yyyy}${mm}${dd}`;
  return `ORD${dateString}-${randomNumber}`;
};

const placeOrder = async (req, res,next) => {
  try {
    const userId = req.session.user
    const { addressId, paymentMethod,couponCode } = req.body;
    
    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } 
    ).lean();
    
    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }
    
    const selectedAddress = addressData.address[0]; 

    const userData = await User.findById(userId);


    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || !cart.items.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Your cart is empty." });
    }
    
    let cartItems = [];
    for (let item of cart.items) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.quantity < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Some products in your cart have limited stock or are unavailable. Please update your cart before placing the order.",
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }
    
const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

let finalAmount = totalPrice < 15000 ? totalPrice + 500 - cart.discount : totalPrice - cart.discount;

if(finalAmount>15000){
  return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.COD_LIMIT_EXCEEDED });

}

    const invoiceDate = new Date();
    const status = "processing";
    const orderId = generateOrderId();

    const orderSchema = new Order({
      orderId,
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      status: status,
      paymentMethod: paymentMethod,
      discount:cart.discount,
      paymentStatus:'Pending'
    });
    await orderSchema.save();

    if(couponCode){
    await Coupon.findOneAndUpdate(
      { name: couponCode },
      { $addToSet: { usedBy: userId } }
    );
  }
    

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );

    const orderedItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }
   

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [],discount:0} });

    return res.status(StatusCodes.OK).json({ success: true, message: Messages.ORDER_PLACED});

  } catch (error) {
    console.log('error in place order',error);
    
  }
};


const placeWalletOrder = async (req, res, next) => {
  try {
    const userId = req.session.user
    const { addressId, paymentMethod,couponCode } = req.body;

    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } 
    ).lean();
    
    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }
    
    const selectedAddress = addressData.address[0]; 

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || !cart.items.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Your cart is empty." });
    }
    
    let cartItems = [];
    for (let item of cart.items) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.quantity < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Some products in your cart have limited stock or are unavailable. Please update your cart before placing the order.",
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }


const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
let finalAmount = totalPrice < 15000 ? totalPrice + 500 - cart.discount : totalPrice - cart.discount;

    const invoiceDate = new Date();
    const status = "processing";

    let wallet = await Wallet.findOne({ userId: userId });

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

    const orderId = generateOrderId();

    const orderSchema = new Order({
      orderId,
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      status: status,
      paymentMethod: paymentMethod,
      discount:cart.discount,
      paymentStatus:'Success'
    });
   const savedOrder= await orderSchema.save();
  
  
  

    wallet.balance -= parseInt(finalAmount);
    wallet.transactions.push({
      amount:finalAmount,
      type: "debit",
      description: "Deducted for purchase",
      orderId:savedOrder._id,
    });
    await wallet.save();


    if(couponCode){
      await Coupon.findOneAndUpdate(
        { name: couponCode },
        { $addToSet: { usedBy: userId } }
      );
    }

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );

    const orderedItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [],discount:0 } });

    return res.status(StatusCodes.SUCCESS).json({
      success: true,
      message: Messages.ORDER_PLACED,
    });
    

  } catch (error) {
    console.log('error in place wallet order',error);
    
  }
};

const loadConfirmation = async (req, res,next) => {
  try {
    const userId = req.session.user

    const orderData = await User.findById(userId, { orders: 1 }).populate(
      "orders"
    );


    const data = orderData.orders.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const orderId = data[0].orderId;
    res.render("orderConfirmation", { orderId: orderId });
  } catch (error) {
console.log('error in loadconfirmation',error);

  }
};

  
const getOrderDetails=async(req,res)=>{
  try {
    const userId=req.session.user
    const userData=await User.findById(userId)
    const orderId=req.query.orderId
    const order=await Order.findOne({orderId})
    res.render('orderDetails',{
      order,
      user:userData
    })
  } catch (error) {
    console.log('error in rendering userDetails',error.message);
    res.redirect('/pageNotFound')
  }
}

const getInvoice=async(req,res)=>{
  try {
    const userId=req.session.user
    const userData=await User.findById(userId)
    const orderId=req.query.orderId
    const order=await Order.findOne({orderId})
    res.render('invoice',{user:userData,order})
  } catch (error) {
    
  }
}

const cancelOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await Order.findByIdAndUpdate(orderId, {
      $set: { status: 'cancelled', cancelReason: reason }
    });

    const orderedItems = order.orderedItems;
    for (const item of orderedItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: item.quantity }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled and products restocked'
    });

  } catch (error) {
    console.log('error in cancel order',error.message);
   
  }
};

const requestReturn = async (req, res) => {
  try {
    const userId = req.session.user  
    const { orderId, returnReason, returnDescription } = req.body;
    const images = req.files ? req.files.map((item) => item.filename) : [];  

    const order = await Order.findOne({ _id: orderId, userId: userId });

    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Order not found or does not belong to the user",
      });
    }

    await Order.findByIdAndUpdate(orderId, {
      $set: {
        status: "return requested",
        requestStatus: "pending",
        returnReason: returnReason,
        returnDescription: returnDescription,
        returnImage: images,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.log('Error in request return:', error.message);

    // Use a proper error status code and error message
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while processing your return request",
    });
  }
};


const cancelReturnRequest = async (req, res) => {
  try {
    const userId = req.session.user
    const { orderId } = req.body;

    // Check if the order exists and belongs to the user
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:'order not found'
      });
    }

    // Reset the return-related fields
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        status: "delivered",
        requestStatus: "",
        returnReason: "",
        returnDescription: "",
        returnImage: [],
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'return request cancelled'
    });

  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res) => {
  try {
    
    const userId = req.session.user
    const {addressId,paymentMethod,couponCode}=req.body;


    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || !cart.items.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Your cart is empty." });
    }
    
    let cartItems = [];
    for (let item of cart.items) {
      const product = item.productId;
    
      if (!product || product.isBlocked || product.quantity < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Some products in your cart have limited stock or are unavailable. Please update your cart before placing the order.",
        });
      }
    
      cartItems.push({
        product: product,
        quantity: item.quantity,
        price: item.totalPrice,
      });
    }


    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = totalPrice < 15000 ? totalPrice + 500 - cart.discount: totalPrice - cart.discount;
 
    const options = {
      amount: finalAmount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };

    const orderedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId).lean();
    
        return {
          product: {
            _id: product._id,
            productName: product.productName,
            productImage: product.productImage,
            salePrice: product.salePrice
          },
          quantity: item.quantity,
          price:item.totalPrice
        };
      })
    );

    const order = await razorpay.orders.create(options);

    const addressData = await Address.findOne(
      { userId: userId, "address._id": addressId },
      { "address.$": 1 } 
    ).lean();
    
    if (!addressData || !addressData.address || addressData.address.length === 0) {
      throw new Error("Address not found");
    }
    
    const selectedAddress = addressData.address[0]; 

    const invoiceDate = new Date();
    const orderId = generateOrderId();

    const orderSchema = new Order({
      orderId,
      userId: userId,
      orderedItems: orderedItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: selectedAddress,
      invoiceDate: invoiceDate,
      paymentMethod: paymentMethod,
      discount:cart.discount,
      razorpayOrderId:order.id,
      paymentStatus: "Failed"

    });
    await orderSchema.save();
    if(couponCode){
      await Coupon.findOneAndUpdate(
        { name: couponCode },
        { $addToSet: { usedBy: userId } }
      );
    }

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );


    await Cart.findOneAndUpdate({ userId }, { $set: { items: [],discount:0 } });
    
    res.status(200).json({
      id: order.id, 
      amount: options.amount, 
      currency: options.currency,
    });
  } catch (error) {
    console.log('error in create order',error);
    
    if (error.statusCode && error.statusCode >= 500) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: Messages.PAYMENT_SERVICE_UNAVAILABLE,
      });
    }
  
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

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

    const orderedItems =order.orderedItems
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product._id, {
        $inc: { quantity: - orderedItems[i].quantity },
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
const cancelProduct = async (req,res,next) => {
  try {
   
    const {orderId,reason,index} = req.body;
    const userId = req.session.user._id;

    const order = await Order.findById(orderId);

    let canceledProduct = order.orderedItems[index];
    
    if(order.paymentMethod!='cod'){
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({ userId:userId, balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(canceledProduct.price);
    wallet.transactions.push({
      amount:canceledProduct.price,
      type: "credit",
      description: "Product cancellation Refund",
      orderId:order._id,
    });
    await wallet.save();
    }
    canceledProduct.productStatus = 'cancelled';

    const productId =canceledProduct.product._id;
    const quantity = canceledProduct.quantity;

    await Product.findByIdAndUpdate(productId, { $inc: { quantity: quantity } });


    order.orderedItems[index] = canceledProduct;
    
    let count=0 
    for(let item of order.orderedItems){
      if(item.productStatus === 'cancelled'){
        count++;
      }
    }
    if(count === order.orderedItems.length){
      order.status = 'cancelled'
    }
    await order.save();
    
    return res.status(StatusCodes.SUCCESS).json({
      success: true,
      message: Messages.PRODUCT_CANCELLED_SUCCESSFULLY,
    });


    
  } catch (error) {
    console.log('error in cancel product',error);
    
  }
}


module.exports={
    userOrder,
    placeOrder,
    placeWalletOrder,
    getOrderDetails,
    getInvoice,
    cancelOrder,
    requestReturn,
    cancelReturnRequest,
   createOrder,
   verifyPayment ,
   loadConfirmation
  
}