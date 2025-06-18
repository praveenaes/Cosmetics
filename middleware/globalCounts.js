const Cart = require('../models/cartSchema');
const User = require('../models/userSchema');
const Wishlist=require('../models/wishlistSchema')

module.exports = async (req, res, next) => {
  try {
    if (req.session.user) {
      const userId = req.session.user;

      const cart = await Cart.findOne({ userId }).lean();
      const wishlist = await Wishlist.findOne({ userId }).lean();

      const cartProductIds = cart
        ? cart.items.map(item => item.productId.toString())
        : [];

      const wishlistProductIds = wishlist
        ? wishlist.products.map(item => item.productId.toString())
        : [];

      const filteredWishlist = wishlistProductIds.filter(
        id => !cartProductIds.includes(id)
      );

      res.locals.cartCount = cart ? cart.items.length : 0;
      res.locals.wishlistCount = filteredWishlist.length;
    } else {
      res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
    }

    next();
  } catch (err) {
    console.error("Error in globalCounts middleware:", err);
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    next();
  }
};