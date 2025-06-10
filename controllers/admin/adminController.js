const User = require('../../models/userSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/login')
    }
    res.render('admin-login',{message:null})
}

const pageError=async(req,res)=>{
    try {
        res.render('pageerror')
    } catch (error) {
        console.log('Error in showing error page')
        res.redirect('/pageError')
    }
}

const login=async(req,res)=>{
    try {
       
        const {email,password}=req.body
        const admin=await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch= await bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin=true
                return res.redirect('/admin/dashboard')
            }else{
                return res.render('admin-login',{message:'Invalid email or password'})
            }
        }else{
            return res.render('admin-login',{message:'Invalid email or password'})
        }
    } catch (error) {
        console.log('login error',error)
        return res.redirect('/pageerror')

    }
}



const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try {
            res.render('dashboard')
        } catch (error) {
            res.redirect('/pageerror')
        }
    }
}

const logout = async (req, res) => { 
    try {
       

        req.session.destroy((err) => {
            if (err) {
                console.log('Error destroying session', err);
                return res.redirect('/admin/login');
            }
            
            res.redirect('/admin/login');
        });

    } catch (error) {
        console.log('Unexpected error during logout', error);
        res.redirect('/pageerror');
    }
};

module.exports={loadLogin,
               pageError,
               login,
               loadDashboard,
               logout,
               }