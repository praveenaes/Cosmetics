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
        category: Schema.Types.ObjectId,
        productNumber: String,
        regularPrice: Number,
        salePrice: Number,
        productOffer: Number,
        quantity: Number,
        warranty: String,
        isBlocked: Boolean,
        productImage: [String],
        status: String,
        brand: String,
        sizeId: Schema.Types.ObjectId
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        default: 0
      },
       productStatus:{
        type:String,
        enum:["active","cancelled"],
        default:'active'
      },
       ProductCancelReason:{
        type:String,
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
    rejectionCategory:{
      type:String
    },
    rejectionReason:{
      type:String
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
    'returned'],
     default: 'pending'
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
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Failed'
    },
    
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    cancelReason:{
      type:String,
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
