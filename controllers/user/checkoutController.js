const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const Coupon=require('../../models/couponSchema')
const StatusCodes  = require('../../helpers/statusCodes');
const Messages=require('../../helpers/messages')

const getCheckout = async (req, res,next) => {
  try {
    
    const userId = req.session.user
    const user = await User.findById(userId);

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: [
        // {
        //   path: "brand",
        //   model: "Brand",
        // },
        {
          path: "category",
          model: "Category",
        },
      ],
    });
    const coupons = await Coupon.find({ isListed: true });

    const wallet = await Wallet.findOne({ userId: userId });

    const addressData = await Address.findOne({ userId: userId });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: false, message: Messages.USER_NOT_FOUND });
    }

    for (let item of cart.items) {
      if (item.productId && item.quantity > item.productId.quantity) {
        item.quantity = item.productId.quantity;
        if (item.quantity === 0) {
          cart.items = cart.items.filter(
            (cartItem) =>
              cartItem.productId.toString() !== item.productId.toString()
          );
        }
      }
    }
    await cart.save();
           
           
    const cartItems = cart.items
    .filter(
      (item) =>
        item.productId &&
        !item.productId.isBlocked &&
        item.productId.category &&
        item.productId.category.isListed &&
        item.productId.quantity > 0
    )
      .map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        totalPrice: item.productId.salePrice * item.quantity,
      }));

    const subtotal = cartItems.reduce(
      (total, item) => total + item.totalPrice,
      0
    );
    let grandTotal = 0;
    
    if (subtotal < 15000) {
      grandTotal = subtotal + 500;
    } else {
      grandTotal = subtotal;
    }

    if(cartItems.length>0){
    res.render("checkout", {
      user,
      cartItems,
      coupons,
      subtotal,
      grandTotal,
      userAddress: addressData,
      wallet: wallet || { balance: 0 },
    })}else{
      
      res.redirect('/cart')
    }
  } catch (error) {
    console.log('error in load checkout',error);
  }
};


const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user
    const { couponCode, subtotal } = req.body;
   
    const coupon = await Coupon.findOne({ name: couponCode, isListed: true });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }


    if (coupon.minimumPrice > subtotal) {
      return res
        .status(400)
        .json({
          success: false,
          message: `You need to have items worth ${coupon.minimumPrice} to apply this coupon`,
        });
    }

    if (coupon.usedBy.includes(userId)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You have already used this coupon.",
        });
    }

    let discount = 0;

    if (coupon.offerPrice) {
      discount = coupon.offerPrice;
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { discount: discount } },
      { new: true, upsert: false } // ensure it doesn't create new if not found
    );
    
    if (!updatedCart) {
      return res.status(400).json({ success: false, message: 'No cart found for user' });
    }
    res.status(200).json({ success: true, message: "Coupon applied", coupon });
    
    
    
  } catch (error) {
  console.log('error in appying coupon',error)
  res.status(500).json({
    success: false,
    message: "Something went wrong while applying the coupon",
  });
  
  }
};

const removeCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user
    await Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { discount: 0 } },
      { new: true }
    );
    res.status(200).json({ success: true, message: "Coupon applied" });
  } catch (error) {
   console.log();
   
  }
};

module.exports={
    getCheckout,
    applyCoupon,
    removeCoupon
   
}