const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')


const getOrder = async (req, res) => {
    try {
      const userId = req.session.user;
  
      const searchQuery = req.query.search || '';
      const currentPage = parseInt(req.query.page) || 1;
      const itemsPerPage = 4

      
  
      const query = {};
      if (searchQuery.trim()) {
        query.orderId = { $regex: new RegExp(searchQuery.trim(), 'i') };
      }
  
      const totalOrders = await Order.countDocuments(query);
  
      const orders = await Order.find(query)
        .populate('userId') 
        .sort({ createdOn: -1 })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage)
        .lean();
  
      const totalPages = Math.ceil(totalOrders / itemsPerPage);
  
      res.render('adminOrder', {
        orders,
        currentPage,
        totalPages,
        searchQuery,
      });
  
    } catch (error) {
      console.log('Error rendering order page:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  

const orderDetails=async(req,res)=>{
    try {
       const admin=req.session.admin
       const adminData=await User.findById(admin)
        const orderId=req.query.id
        const order=await Order.findOne({_id:orderId}).populate('userId')
    
        res.render('adminOrderDetails',{order,user:adminData})
    } catch (error) {
        console.log('errorrrr',error.message);
        
    }
}

const updateStatus = async (req, res, next) => {
    const { orderId, status } = req.body;

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID',
        });
    }
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order status',
        });
    }

    try {
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId }, 
            { $set: { status } }, 
            { new: true, runValidators: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order: updatedOrder, 
        });
    } catch (error) {
        console.error('Error while updating order status:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message,
        });
    }
};

const orderCancel = async (req, res, next) => {
    try {
        console.log('hello1');
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        for (let item of order.orderedItems) {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.product._id },
                { $inc: { quantity: item.quantity } }, 
                { new: true }
            );

            if (updatedProduct) {
                console.log(`Updated product stock for ${updatedProduct.productName}. Quantity added: ${item.quantity}`);
            } else {
                console.log(`Product not found: ${item.product._id}`);
            }
        }
       
        await Order.findOneAndUpdate(
            { _id: orderId },
            { $set: { status: "cancelled" } },
            { new: true }
        );

        console.log('hello2');
        res.status(200).json({success:true,message:'ordercancelled successfully'})
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:'order not found'})
    }
};

const handleReturn = async (req, res) => {
    try {
      const { action, orderId, category, message } = req.body;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }
      if (action === "approved") {
        const order = await Order.findByIdAndUpdate(
          orderId,
          { $set: { requestStatus: "approved" } },
          { new: true }
        );
  
        if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }
        return res.status(200).json({
          success: true,
          message: "Return approved successfully"
        });
  
      } else if (action === "rejected") {
        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: {
              requestStatus: "rejected",
              rejectionCategory: category || "Other",
              rejectionReason: message || "No reason provided"
            }
          },
          { new: true }
        );
  
        if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }
        return res.status(200).json({
          success: true,
          message: "Return request rejected"
        });
      } else {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }
  
    } catch (error) {
      console.error("Handle return error:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  

  const updateReturnStatus = async (req, res,next) => {
    try {
      const { orderId, status } = req.body;
      if (status === "returning") {
        const order = await Order.findByIdAndUpdate(
          orderId,
          { $set: { status: status, updatedAt: new Date() } },
          { new: true }
        );
        if (order) {
          return res.status(200).json({
            success: true,
            message: 'return successful'
          });
          
        } else {
          return res.status(400).json({
            success: false,
            message: 'order not found'
          });
          
        }
      } else if (status === "returned") {
        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: { status: status, updatedAt: new Date() },
          },
          { new: true }
        );
  
        const orderData = await Order.findById(orderId);
        const userId = orderData.userId;
  
        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
          wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }
  
        wallet.balance += parseInt(orderData.finalAmount);
  
        wallet.transactions.push({
          amount:orderData.finalAmount,
          type: "credit",
          description: "Order return Refund",
          orderId:orderData._id
        });
  
        await wallet.save();
    console.log('wallet',wallet);
    
        const orderedItems = order.orderedItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        }));
    
        for (let i = 0; i < orderedItems.length; i++) {
          await Product.findByIdAndUpdate(orderedItems[i].product._id, {
            $inc: { quantity: orderedItems[i].quantity },
          });
        }
  
        if (order) {
          return res.status(200).json({
            success: true,
            message:'returned successfully'
          });
          
        } else {
          return res.status(400).json({
            success: false,
            message: 'order not found'
          });        
        }
      }
    } catch (error) {
      console.log(('error in updating returning status',error.message));
      
    }
  }

module.exports={
getOrder,
orderDetails,
updateStatus,
orderCancel,
handleReturn,
updateReturnStatus
}
