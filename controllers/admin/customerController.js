const User=require('../../models/userSchema')



const customerInfo=async(req,res)=>{
    try {
        
        let search=''
        if(req.query.search){
            search=req.query.search
        }
        let page = parseInt(req.query.page) || 1;

        const limit=5
        const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search +'.*'}},
                {email:{$regex:'.*'+search +'.*'}},
            ],
        })
       
        
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();
        
       
        const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search +'.*'}},
                {email:{$regex:'.*'+search +'.*'}},
            ],
        }).countDocuments()
        const totalPages=Math.ceil(count/limit)
        res.render('customers',{data:userData,currentPage:page,totalPages:totalPages,searchQuery: search })  
        
    } catch (error) {
        
    }
}

const customerBlocked=async(req,res)=>{
    try {
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const customerunBlocked=async(req,res)=>{
    try {
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked
}