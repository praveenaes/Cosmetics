const mongoose = require('mongoose');
const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
    },
    createdOn: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expireOn: {
      type: Date,
      required: true,
    },
    offerPrice: {
      type: Number,
    },
    minimumPrice: {
      type: Number,
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },{ timestamps: true });
   
const Coupon = mongoose.model("Coupon",couponSchema);

module.exports = Coupon;