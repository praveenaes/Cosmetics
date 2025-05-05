const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const Coupon=require('../../models/couponSchema')


const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId);
    const addresses = await Address.find({ userId });

    // Get cart with populated product data
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const cartItems = cart?.items || [];

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const wallet = await Wallet.findOne({ userId });

    // ✅ Fetch valid coupons
    const today = new Date();
    const coupons = await Coupon.find({
      isListed: true,
      expireOn: { $gte: today },
    }).lean();

    // Render view with coupon data included
    res.render('checkout', {
      user,
      addresses,
      cartItems,
      subtotal,
      wallet,
      coupons, // ✅ pass coupons to the view
    });

  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.status(500).send('Internal Server Error');
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user
    const { couponCode, subtotal } = req.body;
    console.log('Subtotal sent to server:', subtotal);



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