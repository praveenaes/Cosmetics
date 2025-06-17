const Cart = require('../models/cartSchema');
const User = require('../models/userSchema');

module.exports = async (req, res, next) => {
  try {
    if (req.session.user) {
      console.log("User in session:", req.session.user);

      const userId = req.session.user;
      const userData = await User.findById(userId).lean();
      const cart = await Cart.findOne({ userId }).lean();

      const cartProductIds = cart
        ? cart.items.map(item => item.productId.toString())
        : [];

      const wishlistProductIds = userData.wishlist.map(id => id.toString());

      const filteredWishlist = wishlistProductIds.filter(
        id => !cartProductIds.includes(id)
      );

      res.locals.cartCount = cart ? cart.items.length : 0;
      res.locals.wishlistCount = filteredWishlist.length;
    } else {
      res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
    }

    console.log("cartCount:", res.locals.cartCount);
    console.log("wishlistCount:", res.locals.wishlistCount);

    next();
  } catch (err) {
    console.error("Error in globalCounts middleware:", err);
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    next();
  }
};