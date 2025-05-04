const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')

const getProductAddPage=async(req,res)=>{
    
    try {
       
        const category=await Category.find({isListed:true})
        const brand=await Brand.find({isBlocked:false})
        res.render('product-add',{
            cat:category,
            brand:brand
        })  
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const addProduct=async(req,res)=>{
    try {
       
        const products=req.body
        const productExists=await Product.findOne({
            productName:products.productName,
        })

        if(!productExists){
            const images=[]

            if(req.files && req.files.length>0){

                for(let i=0;i<req.files.length;i++){

                    const originalImagePath=req.files[i].path
                    const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
                    images.push(req.files[i].filename)
                }
            }

           const categoryId=await Category.findOne({name:products.category})
           if(!categoryId){
            return res.status(400).json('Invalid category name')
           }

           const newProduct=new Product({
            productName:products.productName,
            description:products.description,
            brand:products.brand,
            category:categoryId._id,
            regularPrice:products.regularPrice,
            salePrice:products.salePrice,
            createdOn:new Date(),
            quantity:products.quantity,
            size:products.size,
            color:products.color,
            productImage:images,
            status:'Available'
           })

           await newProduct.save()
           return res.redirect('/admin/addProducts')

        }else{
            return res.status(400).json('Product already exists,Please try with another name')
        }
    } catch (error) {
        console.error('Error saving product',error)
        return res.redirect('/admin/pageerror')
    }
}

const getAllProducts = async (req, res) => {
    try {
      const search = req.query.search || '';
      const page = parseInt(req.query.page) || 1;  // ✅ Convert to number
      const limit = 5;
  
      const productData = await Product.find({
        $or: [
          { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
          { brand: { $regex: new RegExp('.*' + search + '.*', 'i') } },
        ],
      })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('category')
        .exec();
  
      const count = await Product.find({
        $or: [
          { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
          { brand: { $regex: new RegExp('.*' + search + '.*', 'i') } },
        ],
      }).countDocuments();
  
      const category = await Category.find({ isListed: true });
      const brand = await Brand.find({ isBlocked: false });
  
      if (category && brand) {
        res.render('products', {
          data: productData,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          cat: category,
          brand: brand,
          query: req.query 
        });
      } else {
        res.render('page-404');
      }
  
    } catch (error) {
      res.redirect('/pageerror');
    }
  };
  

const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product's category already has a higher category offer" });
        }

        const discountAmount = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.salePrice = findProduct.regularPrice - discountAmount;
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({ status: true });

    } catch (error) {
        console.error("Error in addProductOffer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });

        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const percentage = findProduct.productOffer;

        findProduct.salePrice = findProduct.regularPrice;
        findProduct.productOffer = 0;
        await findProduct.save();

        res.json({ status: true });
    } catch (error) {
        console.error("Error in removeProductOffer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};


const blockProduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const unblockProduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getEditProduct=async(req,res)=>{
   
    try {
        const id=req.query.id
        const product=await Product.findOne({_id:id})
        const category=await Category.find({})
        const brand=await Brand.find({})
        res.render('edit-product',{
            product:product,
            cat:category,
            brand:brand
    
        })
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        const product = await Product.findOne({ _id: id });

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this name already exists. Please try another name' });
        }

        const categoryDoc = await Category.findOne({ name: data.category });
        if (!categoryDoc) {
            return res.status(400).json({ error: 'Invalid category selected.' });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: categoryDoc._id, 
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };

        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};


const deleteSingleImage=async(req,res)=>{
    try {
        const {imageNameToServer,productIdToServer}=req.body
        const product=await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath=path.join('public','uploads','product-images',imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagepath)
            console.log(`Image ${imageNameToServer} delete successfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true})


    } catch (error) {
        res.redirect('/pageerror')
    }
}



module.exports={
  getProductAddPage,
  addProduct,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage
}