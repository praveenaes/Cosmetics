const mongoose=require('mongoose')
const{Schema}=mongoose


const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true
    },
    profileImage: { 
        type: String, 
        
    },
    password:{
        type:String,
        required:false
    },
    
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    wishlist:[
        {
            type:Schema.Types.ObjectId,
            ref:"Product",
        }
    ],
    cart:[{
        type:Schema.Types.ObjectId,
        ref:'Cart'
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:'Wishlist'
    }],
    orderHistory:[{
       type:Schema.Types.ObjectId,
       ref:'Order'
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referralCode:{
        type:String,
        unique: true,
        sparse:true  
    },
    referredBy: {
        type: String,
        default: null
      },
    addresses:[
        {
            type:Schema.Types.ObjectId,
            ref:"Adress",
        },
    ],
    orders:[
        {
            type:Schema.Types.ObjectId,
            ref:"Order",
        }
    ],
    payments:[
        {
            type:Schema.Types.ObjectId,
            ref:"Payment",
        }
    ],
    coupons:[
        {
            type:Schema.Types.ObjectId,
            ref:"Coupon",
        }
    ],
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:"Review",
        }
      ],
      referalCode:{
        type:String
      },
    redeemed:{
        type:Boolean
    },
    redeemedUSers:[{
        type:Schema.Types.ObjectId,
        ref:'User'
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:'Category'
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default: Date.now
        }
    }]
},{timestamps: true})

const User = mongoose.model('User',userSchema)
module.exports=User