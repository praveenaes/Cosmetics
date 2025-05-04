const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0 }, 
    transactions: [
      {
        transactionId:{
          type: String,
              default: () => uuidv4(),
              unique: true,
        },
        amount: Number,
        type: { 
            type: String, 
            enum: ["credit", "debit"], 
            required: true 
        },
        date: { 
            type: Date, 
            default: Date.now 
        },
        description:{
            type:String,
        },
        orderId:{
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        }
      },
    ],
  },
  { timestamps: true }
);

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet
