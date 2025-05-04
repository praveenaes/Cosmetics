const express=require('express')
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
const brandController=require('../controllers/admin/brandController')
const productController=require('../controllers/admin/productController')
const inventoryController=require('../controllers/admin/inventoryController')
const orderController=require('../controllers/admin/orderController')
const couponController=require('../controllers/admin/couponController')
const multer = require('multer')
const storage=require('../helpers/multer')
const uploads=multer({storage:storage})
const {userAuth,adminAuth}=require('../middleware/auth')


router.get('/login',adminController.loadLogin)
router.get('/pageerror',adminController.pageError)

router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//customer management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

//category management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)

//brand Management
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post('/addBrand',adminAuth,uploads.single('image'),brandController.addBrand)
router.get('/blockBrand',adminAuth,brandController.blockBrand)
router.get('/unBlockBrand',adminAuth,brandController.unBlockBrand)
router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

//product management
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProduct)
router.get('/products',adminAuth,productController.getAllProducts)
router.post('/addProductOffer',adminAuth,productController.addProductOffer)
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array('images',4),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)


//inventory management
router.get('/inventory',adminAuth,inventoryController.getInventory)
router.patch('/updateInventory',adminAuth,inventoryController.updateInventory)


//order management
router.get('/orderPage',adminAuth,orderController.getOrder)
router.get('/viewDetails',adminAuth,orderController.orderDetails)
router.put('/updateStatus',adminAuth,orderController.updateStatus)
router.put('/orderCancel',adminAuth,orderController.orderCancel)
router.put('/handleReturn',adminAuth,orderController.handleReturn)
router.put('/updateReturnStatus',adminAuth,orderController.updateReturnStatus)


//coupan management
router.get('/coupon',adminAuth,couponController.getCoupon)
router.post('/coupon',adminAuth,couponController.addCoupon)
router.put('/coupon',adminAuth,couponController.editCoupon)
router.delete('/coupon',adminAuth,couponController.deleteCoupon)

module.exports=router 