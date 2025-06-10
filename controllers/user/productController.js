const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')



const productDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        
        const findCategory = product.category;
        const CategoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
         const maxOffer = Math.max(CategoryOffer, productOffer);


         let salePrice = product.regularPrice;
        if (maxOffer > 0) {
            const discountAmount = Math.floor(product.regularPrice * (maxOffer / 100));
            salePrice = product.regularPrice - discountAmount;
        }

        // 🌟 Find Related Products (same category but exclude the current product)
        const relatedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId } // Exclude current product
        }).limit(4); // Show 4 related products (you can change the limit)

        res.render('product-details', {
            user: userData,
            product: product.toObject(),
            quantity: product.quantity,
            totalOffer: maxOffer,
            category: findCategory,
            relatedProducts: relatedProducts,
            salePrice
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.redirect('/pageNotFound');
    }
};


module.exports={
    productDetails
}