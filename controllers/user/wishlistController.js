const User=require('../../models/userSchema')
const Product=require('../../models/productSchema')
const Wishlist=require('../../models/wishlistSchema')
const Cart=require('../../models/cartSchema')

const getwishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData=await User.findById(userId)
        const userWishlist = await Wishlist.findOne({ userId: userId }).populate('products.productId');
        if (!userWishlist || userWishlist.products.length === 0) {
            return res.render('wishlist', {
                user: userId,  
                wishlist: [],  
            });
        }
        const products = userWishlist.products.map(item => item.productId); 
        res.render('wishlist', {
            user: userData,
            wishlist: products,
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.redirect('/pageNotFound');
    }
};


const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(400).json({ status: false, message: 'User is not logged in' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const cart = await Cart.findOne({ userId: userId });
   
    
    if (cart) {
      const productInCart = cart.items.some(item => item.productId?.toString() === productId);
      if (productInCart) {
        return res.status(200).json({
          status: false,
          message: 'Product already in cart',
        });
      }
    }
    
    let wishlist = await Wishlist.findOne({ userId: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: userId, products: [] });
    }

const productExists = wishlist.products.some(item => item.productId.equals(productId));
    if (productExists) {
      return res.status(200).json({
        status: false,
        message: 'Product already in wishlist',
      });
    }
    wishlist.products.push({ productId: productId });
    await wishlist.save();
    
    return res.status(200).json({
      status: true,
      message: 'Product added to wishlist',
    });

  } catch (error) {
    console.error('Error in adding product into wishlist:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
    });
  }
};


const removeWishlist = async (req, res) => {
  try {
    const userId = req.session.user;  // Ensure the user ID is fetched correctly from the session
    const productId = req.params.productId;  // The productId to remove from the wishlist

    // Log values to ensure they are correct
    console.log('User ID:', userId);
    console.log('Product ID:', productId);

    // Find the wishlist document for the user
    const wishlist = await Wishlist.findOne({ userId: userId });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found for user' });
    }

    // Check if the product exists in the wishlist
    const productIndex = wishlist.products.findIndex(product => product.productId.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in wishlist' });
    }

    // Remove the product from the products array
    wishlist.products.splice(productIndex, 1);
    
    // Save the updated wishlist
    await wishlist.save();

    return res.json({ success: true, message: 'Product removed from wishlist' });

  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;  
    const { id:productId } = req.params;  
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const product = await Product.findById(productId); 
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const price = product.salePrice || product.regularPrice;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: []
      });
    }
    const existingItem = cart.items.find(item => item.productId.equals(productId));
    if (existingItem) {
      return res.status(200).json({ success: false, message: 'Product already in cart' });
    }
    const item = {
      productId,
      quantity: 1,
      price: price,
      totalPrice: price 
    };

    cart.items.push(item);
    await cart.save();``

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId: productId } } }
    );

    return res.status(200).json({ success: true, message: 'Product added to cart' });

  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



module.exports={
    getwishlist,
    addToWishlist,
    removeWishlist,
    addCartFromWishlist
}