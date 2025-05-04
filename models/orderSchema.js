const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    orderedItems: [{
      product: {
        _id: Schema.Types.ObjectId,
        productName: String,
        description: String,
        categoryId: Schema.Types.ObjectId,
        productNumber: String,
        regularPrice: Number,
        salePrice: Number,
        productOffer: Number,
        quantity: Number,
        warranty: String,
        isBlocked: Boolean,
        productImage: [String],
        status: String,
        brandId: Schema.Types.ObjectId,
        sizeId: Schema.Types.ObjectId
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        default: 0
      }
    }],
    address: {
      addressType: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      
      city: {
        type: String,
        required: true
      },
      landMark: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      pincode: {
        type: Number,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      altPhone: {
        type: String,
        required: true
      }
    },
    totalPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    invoiceDate: Date,
    status: {
      type: String,
      required: true,
      enum: ['pending',
        'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'return requested',
    'returning',
    'returned']
    },
    requestStatus:{
      type:String,
      enum:["pending","approved","rejected"],
    },
    returnReason : {
      type: String,
    },
    returnDescription:{
      type:String,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cod', 'wallet', 'online payment']
    },
    cancelReason:{
      Type:String,
    },
    returnImage:[{
      type:String,
    }],
    createdOn: {
      type: Date,
      default: Date.now,
      required: true
    },
    updatedOn: {
      type: Date,
      default: Date.now,
      required: true
    },
    deliveredOn: {
      type: Date,
      default: Date.now,
      required: true
    },
    couponApplied: {
      type: Boolean,
      default: false
    }
  });
  
  

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
