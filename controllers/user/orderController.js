const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const { StatusCodes } = require('http-status-codes');

const userOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    
    // If user is not logged in, redirect to login page
    if (!userId) {
      console.log('User not logged in');
      return res.redirect('/login');
    }

    // Get the search query from the request
    const query = req.query.query || '';  // Default to empty string if no query is provided
    const page = parseInt(req.query.page) || 1;  // Get the page number, default to 1 if not provided
    const ordersPerPage = 4;  // Number of orders to display per page
    const skip = (page - 1) * ordersPerPage;  // Skip calculation for pagination

    // Find the user data
    const userData = await User.findById(userId);

    // Build the search condition (for orderId matching the query)
    const searchCondition = { userId };

    // If query exists, filter by orderId
    if (query) {
      searchCondition.orderId = { $regex: query, $options: 'i' };  // Case-insensitive search
    }

    // Fetch orders matching the search condition with pagination
    const orders = await Order.find(searchCondition)
      .skip(skip)
      .limit(ordersPerPage)
      .sort({ createdOn: -1 });  // Sort orders by date (optional, adjust as needed)

    // Get total number of orders for pagination
    const totalOrders = await Order.countDocuments(searchCondition);
    const totalPages = Math.ceil(totalOrders / ordersPerPage);

    // Render the userOrder view with orders, pagination, and search query
    res.render('userOrder', {
      user: userData,
      orders,
      query,  // Pass the query back to EJS for the search input field
      currentPage: page,
      totalPages
    });
    
  } catch (error) {
    console.log('Error in rendering order page:', error.message);
    res.status(500).send('Server error');
  }
};

const placeOrder = async (req, res) => {
    try {
      const userId = req.session.user
      const { addressId, paymentMethod } = req.body;
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      const addressData = await Address.findOne(
        { userId: userId, "address._id": addressId },
        { "address.$": 1 }).lean();
      const selectedAddress = addressData.address[0];

      if (!cart || cart.items.length === 0) {
        return res.redirect('/cart');
      }
  
            const cartItems = await Promise.all(cart.items.map(async (item) => {
        const product = await Product.findById(item.productId).lean(); 
        return {
          product: product, 
          quantity: item.quantity,
          price: item.totalPrice,
      };
      }));
  
     totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
  
      const discount = cart.discount || 0;
      const finalAmount = totalPrice - discount;
  
  
      const newOrder = new Order({
        userId,
        orderedItems:cartItems,
        totalPrice,
        discount,
        paymentMethod,
        finalAmount,
        address: selectedAddress,
        invoiceDate: new Date(),
        status: 'processing',
        couponApplied: !!cart.couponCode,
      });
  
      await newOrder.save();
  
      await Promise.all(
        cartItems.map(async (item) => {
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { quantity: -item.quantity } }
          );
        })
      );


      await Cart.deleteOne({ userId });
  
      res.render('orderConfirmation', { orderId: newOrder._id });
  
    } catch (err) {
      console.error('Order placement failed:', err);
      res.status(500).send('Internal Server Error');
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

const cancelOrder = async (req, res, next) => {
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

const requestReturn = async (req, res, next) => {
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


const cancelReturnRequest = async (req, res, next) => {
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

                          

module.exports={
    userOrder,
    placeOrder,
    getOrderDetails,
    getInvoice,
    cancelOrder,
    requestReturn,cancelReturnRequest
   
}