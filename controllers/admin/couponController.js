const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const Coupon=require('../../models/couponSchema')
const dayjs = require('dayjs');


const getCoupon=async(req,res)=>{
    try {
        let page = parseInt(req.query.page) || 1;
        const limit = 8;
        let coupons = await Coupon.find();
    
        for (let coupon of coupons) {
          if (coupon.expireOn < new Date() || coupon.createdOn > new Date()) {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isListed: false } },
              { new: true }
            );
          } else {
            await Coupon.findByIdAndUpdate(
              coupon._id,
              { $set: { isListed: true } },
              { new: true }
            );
          }
        }
    
        const updatedCoupons = await Coupon.find()
          .limit(limit)
          .skip((page - 1) * limit)
          .sort({createdAt : -1})
    
        const count= await Coupon.countDocuments()
        const totalPages = Math.ceil(count / limit);
    
        return res.render('coupon', { 
          coupons: updatedCoupons,
          currentPage: page,
          totalPages
        });
      } catch (error) {
        console.log('error in rendering coupan page',error.message);
        
      }
}

const addCoupon = async (req, res) => {
  try {
    const {
      couponName,
      startDate,
      endDate,
      offerPrice,
      minimumPrice
    } = req.body;
 
    const parsedOfferPrice = offerPrice ? parseFloat(offerPrice) : null;
    const parsedMinimumPrice = parseFloat(minimumPrice);

    // Validate coupon name
    if (!couponName || !/^[A-Za-z0-9 ]{3,50}$/.test(couponName)) {
      return res.status(400).json({
        success: false,
        message: "Coupon name must be alphanumeric and 3-50 characters long.",
      });
    }

    // Validate offer price
    if (!parsedOfferPrice || parsedOfferPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Offer price must be a positive number.",
      });
    }

    // Validate minimum price
    if (isNaN(parsedMinimumPrice) || parsedMinimumPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum price must be a positive number.",
      });
    }

    if (parsedMinimumPrice < parsedOfferPrice) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot be less than offer price.",
      });
    }

    // Prepare date fields using dayjs
    const data = {
      name: couponName,
      startDate: dayjs(startDate).startOf('day').toDate(),
      expireOn: dayjs(endDate).endOf('day').toDate(),
      offerPrice: parsedOfferPrice,
      minimumPrice: parsedMinimumPrice,
    };

    // Check for duplicate coupon name (case-insensitive)
    const existingCoupon = await Coupon.find({
      name: { $regex: `^${data.name}$`, $options: 'i' },
    });

    if (existingCoupon.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Coupon with this name already exists.",
      });
    }

    const newCoupon = new Coupon(data);
    const savedCoupon = await newCoupon.save();
    
    if (savedCoupon) {
      return res.status(200).json({
        success: true,
        message: "Coupon added successfully!",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to add coupon.",
      });
    }
   
   
    
  } catch (error) {
    console.error("Error in adding coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const editCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;

    const name = req.body.name?.trim();
    const startDate = new Date(req.body.createdOn + "T00:00:00");
    const endDate = new Date(req.body.expireOn + "T00:00:00");
    const offerPrice = req.body.offerPrice ? parseFloat(req.body.offerPrice) : null;
    const minimumPrice = parseFloat(req.body.minimumPrice);

    // Check for duplicate name (excluding current coupon)
    const existingCoupon = await Coupon.find({
      name: { $regex: `^${name}$`, $options: 'i' },
      _id: { $ne: couponId },
    });

    if (existingCoupon.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This coupon already exists'
      });
    }

    const updatedCouponData = {
      name,
      createdOn: startDate,
      expireOn: endDate,
      offerPrice,
      minimumPrice,
    };

    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updatedCouponData, {
      new: true,
    });

    if (updatedCoupon) {
      return res.status(200).json({
        success: true,
        message: 'Coupon updated successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Coupon updating failed'
      });
    }
  } catch (error) {
   console.log('error in editing coupon',error);
   
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;

    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    if (deletedCoupon) {
      return res.status(200).json({
        success: true,
        message: 'Coupon deleted'
      });      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Error on deleting coupon'
      });
      
    }
  } catch (error) {
    console.log('error in editing coupon',error);

  }
};


module.exports={
    getCoupon,
    addCoupon,
    editCoupon,
    deleteCoupon
}