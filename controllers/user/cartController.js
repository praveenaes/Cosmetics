const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Wishlist=require('../../models/wishlistSchema')
const Cart=require('../../models/cartSchema')
const mongoose = require('mongoose');

const addToCart = async (req, res) => {
    try {

      const userId = req.session.user 
      const { productId, quantity } = req.body;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not logged in." });
      }
      const qty = parseInt(quantity) || 1;
      const product = await Product.findById(productId);
      if (!product || product.quantity < 1) {
        return res.json({ success: false, message: 'Product is out of stock!' });
      }
  
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        const totalPrice = product.salePrice * qty;
  
        const newCart = new Cart({
          userId,
          items: [{
            productId,
            quantity: qty,
            price: product.salePrice,
            totalPrice,
          }]
        });
  
        await newCart.save();
        return res.json({ success: true, message: 'Product added to cart!' });
      }
      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );
  
      if (itemIndex > -1) {
        const existingItem = cart.items[itemIndex];
  
        if (existingItem.quantity >= 5) {
          return res.json({
            success: false,
            message: 'Limit exceeded. Max 5 per item.',
          });
        }
  
        const newQty = existingItem.quantity + qty;
  
        if (newQty > 5) {
          return res.json({
            success: false,
            message: 'Limit exceeded. Max 5 per item.',
          });
        }
  
        if (product.quantity < newQty) {
          return res.json({
            success: false,
            message: 'Not enough stock to add more!',
          });
        }
  
        existingItem.quantity = newQty;
        existingItem.totalPrice = newQty * existingItem.price;
  
      } else {
        if (product.quantity < qty) {
          return res.json({
            success: false,
            message: 'Not enough stock!',
          });
        }
  
        const totalPrice = product.salePrice * qty;
  
        cart.items.push({
          productId,
          quantity: qty,
          price: product.salePrice,
          totalPrice,
        });
      }
  
      await cart.save();
      return res.json({
        success: true,
        message: 'Product added to cart!',
      });
    } catch (error) {
      console.error('Error in addToCart:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  };
  

  const getCart = async (req, res) => {
    try {
      const userId = req.session.user;
      const userData = await User.findById(userId);
      const cart = await Cart.findOne({ userId }).populate('items.productId');
     
      let cartItems = [];
      let cartTotal = 0;
  
      if (cart && cart.items.length > 0) {
        cartItems = cart.items.map(item => {
          const product = item.productId;
          const itemTotal = product.salePrice * item.quantity;
  
          cartTotal += itemTotal;
          return {
            productId: product._id,
            productName: product.productName,
            image: product.productImage, 
            price: product.salePrice,
            quantity: item.quantity,
            stock: product.quantity
          };
        });
      }
      res.render('cart', {
        user: userData,
        cart: { items: cartItems },
        cartTotal
      });
  
    } catch (error) {
      console.error('Error loading cart page:', error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const removeItemFromCart = async (req, res) => {
    try {
      const userId = req.session.user;
      const { index } = req.body; 
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }
  
      if (index < 0 || index >= cart.items.length) {
        return res.status(400).json({ success: false, message: "Invalid item index" });
      }
      cart.items.splice(index, 1);
      await cart.save();
  
      return res.json({ success: true, message: "Item removed from cart" });
    } catch (error) {
      console.error('Error removing item from cart:', error.message);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  
 const updateCartQuantity=async (req, res) => {
  
  
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user
    const cart = await Cart.findOne({ userId });

    const item = cart.items.find(item => item.productId.toString() === productId);
    if (item) {
      item.quantity = parseInt(quantity);
      item.totalPrice=item.quantity*item.price
      await cart.save();
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
}


module.exports={
    addToCart,
    getCart,
    removeItemFromCart,
    updateCartQuantity
}