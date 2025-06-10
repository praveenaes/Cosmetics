const User = require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')
const Brand=require('../../models/brandSchema')
const Wallet=require('../../models/walletSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')

const loadHomepage=async(req,res)=>{
    try {
        const user=req.session.user
        const categories=await Category.find({isListed:true})
        let productData=await Product.find(
            {isBlocked:false,
              category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
            }
        ) 

        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,6)
     if(user){
        const userData=await User.findOne({_id:user})
        return res.render('homepage',{user:userData,products:productData})
     }
     return res.render('homepage', {user:null, products:productData});
         
    } catch (error) {
        console.log('Home page not found',error.message);
        res.status(500).send('Server error')
        
    }
}

const pageNotFound= async(req,res)=>{
    try {
        res.render('pageNotFound')
    } catch (error) {
        console.log('Error rendering pagenotfound',error.message);
        res.redirect('/pageNotFound')
        
    }
}

const loadLogin=async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/')
        }
        
    } catch (error) {
       res.redirect('pageNotFound')
    }
}

const loadSignup=async(req,res)=>{
    try {
        return res.render('signup')
    } catch (error) {
        console.log('Signup page not loading',error.message)
        res.status(500).send('Server error')
    }
}

const signUp=async(req,res)=>{
    try {
    
        const{name,phone,email,password,confirm_password,referral}=req.body
       
        if(password!==confirm_password){
            return res.render('signup',{message:'Password do not match'})
            
        }
        
        const findUser=await User.findOne({email})
        if(findUser){
            return res.render('signup',{message:'User with this email already exist', formData: { name, phone,  referral }})
        }
         if (referral && referral.trim()) {
      const referralCode = referral.toUpperCase();
      const referredUser = await User.findOne({ referralCode: referralCode });
      if (!referredUser) {
       
        return res.render("signup",{message:'Invalid referral code',formData: { name, phone,email,  referral }});
      }
    }
        const otp=generateOtp()
       
    
        const emailSent=await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json('email-error')
        }
      
        req.session.userOtp=otp
         req.session.otpExpiry = Date.now() + 60000;
        req.session.userData={name,phone,email,password,referral};
        console.log('OTP sent',otp)
       
    
        res.render('verify-otp')
        
        
    } catch (error) {
        console.error('signup error',error)
        res.redirect('/pageNotFound')
    }
    }
    
    function generateReferralCode(input) {
  if (!input || typeof input !== "string") return null;

  const base = input.substring(0, 4).toUpperCase();

  const randomNumber = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");

  return `${base}${randomNumber}`;
}



const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}





function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sendVerificationEmail(email,otp) {
    try {
       
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

    const info = await transporter.sendMail    ({
    from:process.env.NODEMAILER_EMAIL,
    to:email,
    subject:'Verify your account',
    text:`Your OTP is ${otp}`,
    html:`<b>Your OTP:${otp}</b>`
    })
    return info.accepted.length>0
    } catch (error) {
        console.error('Error sending email',error)
        return  false
    }
}

const verifyOtp=async(req,res)=>{
    try {
        const{otp}=req.body
        console.log(otp)

         if (!req.session.otpExpiry || Date.now() > req.session.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if(otp===req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

 let referral = req.session.userData.referral;
      
      referral = referral.toUpperCase();
      let referredUser;
      if (referral && referral.trim()) {
        referredUser = await User.findOne({ referralCode: referral });

        let wallet = await Wallet.findOne({ userId: referredUser._id });
        if (!wallet) {
          wallet = new Wallet({
            userId: referredUser._id,
            balance: 0,
            transactions: [],
          });
        }

        wallet.balance += 500;

        wallet.transactions.push({
          amount: 500,
          type: "credit",
          description: "Referral Reward",
        });

        await wallet.save();
      }

          const referralCode = generateReferralCode(user.name)
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
                 referralCode,
                referredBy: referredUser?.name,
            })
             await saveUserData.save()
 if (referral && referral.trim()) {
        let wallet = await Wallet.findOne({ userId: saveUserData._id });
        if (!wallet) {
          wallet = new Wallet({
            userId: saveUserData._id,
            balance: 0,
            transactions: [],
          });
        }

        wallet.balance += 200;

        wallet.transactions.push({
          amount: 200,
          type: "credit",
          description: "Referral Reward",
        });

        await wallet.save();
      }
             req.session.user=saveUserData
             res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(400).json({success:false,message:'Invalid OTP, Please try again'})
        }
    } catch (error) {
        console.error('Error verifying OTP',error);
        res.status(500).json({success:false,message:'An error Occuredd'})
    }
}

const resendOtp =async(req,res)=>{
    try {
       
        const email = req.session.userData.email
        console.log('email',email)
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
       
        const otp = generateOtp()
        req.session.userOtp=otp
        req.session.otpExpiry = Date.now() + 60000;
        console.log('Resend OTP',otp)
        const emailSent=await sendVerificationEmail(email,otp)
        if(!emailSent){
            console.log('Resend OTP',otp)
            res.status(200).json({success:true,message:'OTP resend successfully'})
        }else{
            res.status(500).json({success:false,message:'Failed to resend OTP.Please try again'})
        }
        
    } catch (error) {
        console.error('Error resending OTP',error)
        res.status(500).json({success:false,message:'Internal server error.Please try again'})
    }
}

const login= async(req,res)=>{
    try {
        const{name,password,email}=req.body
        const findUser=await User.findOne({isAdmin:0,email:email})
        if(!findUser){
            return res.render('login',{message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:'User blocked by admin'})
        }
        const passwordMatch=await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.render('login',{message:'Incorrect password',formData: { name, email }})
        }
        req.session.user=findUser._id
        res.redirect('/')
    } catch (error) {
        console.log('login error',error)
        res.render('login',{message:'Login failed.Please try again later'})
    }

}

const logout=async(req,res)=>{
try {
    req.session.destroy((err)=>{
        if(err){
            console.log('session destruction error',err.message)
            return res.redirect('/pageNotFound')
        }
        return res.redirect('/')
    })
} catch (error) {
    console.log('Logout error',error)
    res.redirect('/pageNotFound')
}

}


const loadShoppingPage = async (req, res) => {
    try {
      const { query = '', category = '', brand = '', gt = 0, lt = 1000000, sort = 'name-asc', page = 1 } = req.query;
      const limit = 6;
      const skip = (page - 1) * limit;
      const filter = {
        isBlocked: false,
        
      };


const listedCategories = await Category.find({ isListed: true }).select('_id');
const listedCategoryIds = listedCategories.map(cat => cat._id.toString());


if (category && listedCategoryIds.includes(category)) {
  filter.category = category;
} else if (!category) {
  filter.category = { $in: listedCategoryIds };
} else {
  filter.category = { $in: [] }; 
}




      if (query) {
        filter.productName = { $regex: query, $options: 'i' }; 
      }
    
      if (brand) {
        filter.brand = brand;
      }
      if (gt && lt) {
        filter.salePrice = { $gte: parseFloat(gt), $lte: parseFloat(lt) };
      } else if (gt) {
        filter.salePrice = { $gte: parseFloat(gt) };
      } else if (lt) {
        filter.salePrice = { $lte: parseFloat(lt) };
      }
  
      let sortQuery = {};
      switch (sort) {
        case 'price-asc':
          sortQuery = { salePrice: 1 };
          break;
        case 'price-desc':
          sortQuery = { salePrice: -1 };
          break;
        case 'name-asc':
          sortQuery = { productName: 1 };
          break;
        case 'name-desc':
          sortQuery = { productName: -1 };
          break;
        default:
          sortQuery = { productName: 1 };
          break;
      }
  
      const products = await Product.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit);
  
      const totalProducts = await Product.countDocuments(filter);
  
      const totalPages = Math.ceil(totalProducts / limit);
  
      const categories = await Category.find();
      const brands = await Brand.find();
  
      const userId=req.session.user
      const userData =await User.findById(userId)
      res.render('shop', {
        user: userData, 
        products: products,
        category: categories,
        brand: brands,
        totalProducts: totalPages,
        currentPage: page,
        totalPages: totalPages,
        query: req.query
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Server Error');
    }
  };
  


const filterProduct=async(req,res)=>{
    try {
        const user=req.session.user
        const category=req.query.category
        const brand=req.query.brand
        const findCategory=category ? await Category.findOne({_id:category}):null
        const findBrand=brand ? await Brand.findOne({_id:brand}):null
        const brands=await Brand.find({}).lean()
        const query={
            isBlocked:false,
            quantity:{$gt:0}
        }

        if(findCategory){
            query.category=findCategory._id
        }
        if(findBrand){
            query.brand=findBrand.brandName
        }

        let findProducts=await Product.find(query).lean()
        findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))

        const categories=await Category.find({isListed:true})
        let itemsPerPage=6

        let currentPage=parseInt(req.query.page) || 1
        let startIndex=(currentPage-1)*itemsPerPage
        let endIndex=startIndex+itemsPerPage
        let totalPages=Math.ceil(findProducts.length/itemsPerPage)
        const currentProduct=findProducts.slice(startIndex,endIndex)
        let userData = null

        if(user){
            userData=await User.findOne({_id:user})
            if(userData){
                const searchEntry={
                    category:findCategory ? findCategory._id:null,
                    brand:findBrand ? findBrand.brandName:null,
                    searchedOn:new Date()
            }
            userData.searchHistory.push(searchEntry)
            await userData.save()
            }
         }
        req.session.filteredProducts=currentProduct
        
        res.render('shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            selectedCategory:category || null,
            selectedBrand:brand || null
        })

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const filterByPrice=async(req,res)=>{
    try {
        const user=req.session.user
        const userData=await User.findOne({_id:user})
        const brands=await Brand.find({}).lean()
        const categories=await Category.find({isListed:true}).lean()

        let findProducts=await Product.find({
            salePrice:{$gt:req.query.gt,$lt:req.query.lt},
            isBlocked:false,
            quantity:{$gt:0}
        }).lean()

        findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        
        let itemsPerPage=6
        let currentPage=parseInt(req.query.page) || 1
        let startIndex=(currentPage-1)*itemsPerPage
        let endIndex=startIndex + itemsPerPage
        let totalPages=Math.ceil(findProducts.length/itemsPerPage)
        const currentProduct=findProducts.slice(startIndex,endIndex)
        req.session.filteredProducts=findProducts

        res.render('shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage
        })

    } catch (error) {
      console.log(error)
      res.redirect('/pageNotFound')

        
    }
}

const searchProducts=async(req,res)=>{
    try {
        const user=req.session.user
        const userData=await User.findOne({_id:user})
        const search=req.body.query

        const brands=await Brand.find({}).lean()
        const categories=await Category.find({isListed:true}).lean()
        const categoryIds=categories.map(category=>category._id.toString())
        let searchResult=[]
        if(req.session.filteredProducts && req.session.filteredProducts.length>0){
            searchResult=req.session.filteredProducts.filter(product=>
            product.productName.toLowerCase().includes(search.toLowerCase())
            )
        }else{
            searchResult=await Product.find({
                productName:{$regex:'.*'+search+'.*',$options:'i'},
                isBlocked:false,
                quantity:{$gt:0},
                category:{$in:categoryIds}
            })
        }

        searchResult.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        let itemsPerPage=6
        let currentPage=parseInt(req.query.page) || 1
        let startIndex=(currentPage-1)*itemsPerPage
        let endIndex=startIndex+itemsPerPage
        let totalPages=Math.ceil(searchResult.length/itemsPerPage)
        const currentProduct=searchResult.slice(startIndex,endIndex)

        res.render('shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            count:searchResult.length
        })
    } catch (error) {
        console.log('Error',error)
        res.redirect('/pageNotFound')
    }
}



module.exports={loadHomepage,
               pageNotFound,
               loadSignup,
               signUp,
               loadLogin,
               verifyOtp,
               resendOtp,
               login,
               logout,
               loadShoppingPage,
               filterProduct,
               filterByPrice,
               searchProducts
            }