const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')

function generateOtp() {
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Your OTP for password reset',
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP:${otp}<h4><br></b>`
        }
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent:', info.messageId)
        return true;

    } catch (error) {
        console.error('Error sending email', error)
        return false;
    }
}

const getForgotPassPage = async (req, res) => {
    try {
        console.log('user', req.session.user)
        res.render('forgot-password')
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

const forgotEmailvalid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.otpGeneratedAt = Date.now(); // Store the generation time
                req.session.email = email;

                console.log('OTP:', otp);
                res.render('forgotPass-otp');
            } else {
                res.json({ success: false, message: 'Failed to send OTP. Please try again' });
            }

        } else {
            res.render('forgot-password', {
                message: 'User with this email does not exist'
            });
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};


const OTP_EXPIRY_TIME = 1 * 60 * 1000; // 5 minutes in milliseconds

const verifyForgotPassOtp = async (req, res) => {
    try {
        console.log('Received OTP:', req.body.otp);
        console.log('Stored OTP:', req.session.userOtp);

        const currentTime = Date.now();
        const otpGeneratedTime = req.session.otpGeneratedAt;

        // Check if OTP expired
        if (!otpGeneratedTime || (currentTime - otpGeneratedTime) > OTP_EXPIRY_TIME) {
            console.log('OTP expired');
            return res.json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }



        // Check if OTP matches
        if (req.body.otp === req.session.userOtp) {
            console.log('OTP matched, redirecting to /reset-password');
            return res.json({
                success: true,
                message: 'OTP verified',
                redirectUrl: '/reset-password'
            });
        } else {
            console.log('OTP mismatch');
            return res.json({
                success: false,
                message: 'OTP not matching'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again'
        });
    }
};


const getResetPassPage = async (req, res) => {
    try {
        res.render('reset-password')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    const email = req.session.email;

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();

    console.log('Resending OTP to email:', email);
    const emailSent = await sendVerificationEmail(email, otp);
   
console.log('sendVerificationEmail returned:', emailSent);


    if (emailSent) {
      console.log('Resend OTP:', otp);

      // ✅ Ensure session is saved before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        return res.status(200).json({ success: true, message: 'Resend OTP successful' });
      });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send email' });
    }

  } catch (error) {
    console.error('Error in resendOtp:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {

    }
}

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email; // ✅ use email here

        const user = await User.findOne({ email });

        if (!user) {
            return res.redirect('/pageNotFound');
        }

        if (newPass1 !== newPass2) {
            return res.render('reset-password', {
                message: 'Passwords do not match',
                user
            });
        }

        const isSamePassword = await bcrypt.compare(newPass1, user.password);
        if (isSamePassword) {
            return res.render('reset-password', {
                message: 'This is your old password',
                user
            });
        }

        const passwordHash = await securePassword(newPass1);
        await User.updateOne(
            { _id: user._id },
            { $set: { password: passwordHash } }
        );

        // Clear session
        req.session.userOtp = null;
        req.session.email = null;
        req.session.userData = null;

        return res.redirect('/login');

    } catch (error) {
        console.log("Error in postNewPassword:", error.message);
        res.redirect('/pageNotFound');
    }
};


const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render('userProfile', {
            user: userData,

        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};




const changeEmail = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findOne({ _id: user })
        res.render('change-email', { user: userData })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changeEmailvalid = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const { email } = req.body;

    if (email !== userData.email) {
      return res.render('change-email', {
        user: userData,
        message: 'Enter your current email',
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = otp;
      req.session.otpExpiry = Date.now() + 60000; // ✅ This fixes the conflict

      // ✅ Fixed this line
      req.session.userData = { email };

      req.session.email = email;

      const remainingTime = 60;

      res.render('change-email-otp', {
        user: userData,
        remainingTime
      });

      console.log('Email sent', email);
      console.log('OTP', otp);
    } else {
      res.json('email-error');
    }

  } catch (error) {
    console.error(error);
    res.redirect('/pageNotFound');
  }
};



const verifyEmailOtp = async (req, res) => {
  try {
    const userId = req.session.user;
    const usersData = await User.findById(userId);

    const enteredOtp = req.body.otp;
    const originalOtp = req.session.userOtp;
    const otpExpiry = req.session.otpExpiry;

    const currentTime = Date.now();
    const remainingTime = Math.max(0, Math.floor((otpExpiry - currentTime) / 1000));

    console.log('Entered OTP:', enteredOtp);

    // ✅ Expired OTP
    if (!otpExpiry || currentTime > otpExpiry) {
      return res.render('change-email-otp', {
        user: usersData,
        message: 'OTP expired. Please request a new one.',
        userData: req.session.userData,
        remainingTime: 0
      });
    }

    // ✅ OTP matched
    if (enteredOtp === originalOtp) {
      req.session.userOtp = null;
      req.session.otpExpiry = null;
      

      return res.render('new-email', {
        user: usersData,
        userData: req.session.userData
      });
    } 
    
    // ❌ OTP not matched
    else {
      return res.render('change-email-otp', {
        user: usersData,
        message: 'OTP not matching',
        userData: req.session.userData,
        remainingTime
      });
    }

  } catch (error) {
    console.error('Error in verifyEmailOtp:', error);
    res.redirect('/pageNotFound');
  }
};


const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.newEmail.trim();
        const userId = req.session.user;

        const user = await User.findById(userId);

        if (!user) {
            return res.redirect('/pageNotFound');
        }

        if (user.email === newEmail) {
            return res.render('new-email', {
                user: user,
                message: 'This is your old email id. Please enter a new one.'
            });
        }

        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return res.render('new-email', {
                user: user,
                message: 'This email already exists. Please use a different email.'
            });
        }

        await User.findByIdAndUpdate(userId, { email: newEmail });
        res.redirect('/userprofile');

    } catch (error) {
        console.log('Error in updateEmail:', error);
        res.redirect('/pageNotFound');
    }
};


const changePassword = async (req, res) => {
    try {
        const userId = req.session.user;
        const usersData = await User.findById(userId);
        res.render('reset-password', { user: usersData })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changePasswordValid = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const { email } = req.body;

        if (!userData) {
            return res.redirect('/pageNotFound');
        }

        if (email !== userData.email) {
            return res.render('change-password', {
                user: userData,
                message: 'Enter your current email.'
            });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.otpExpiresAt = Date.now() + 60000; // <-- Set OTP expiry
            req.session.userData = req.body;
            req.session.email = email;

            res.render('change-password-otp', { user: userData });
            console.log('OTP:', otp);
        } else {
            res.json({
                success: false,
                message: 'Failed to send OTP. Please try again.'
            });
        }

    } catch (error) {
        console.log('Error in change password validation:', error);
        res.redirect('/pageNotFound');
    }
};


const verifyChangePassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const storedOtp = req.session.userOtp;
    const otpExpiry = req.session.otpExpiresAt;

    // Check if OTP is expired
    if (!otpExpiry || Date.now() > otpExpiry) {
      return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check if OTP matches
    if (enteredOtp === storedOtp) {
      // Optionally clear OTP after successful validation
      req.session.userOtp = null;
      req.session.otpExpiresAt = null;

      return res.json({ success: true, redirectUrl: '/reset-password' });
    } else {
      return res.json({ success: false, message: 'OTP not matching' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred. Please try again later' });
  }
};

const resendChangePasswordOtp = async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) {
            return res.json({ success: false, message: 'Session expired. Please try again.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'User not found.' });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.otpExpiresAt = Date.now() + 60000; // <-- Set expiry correctly
            console.log('Resent OTP:', otp);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Failed to send OTP. Please try again.' });
        }

    } catch (error) {
        console.log('Error in resendChangePasswordOtp:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const userAddress = async (req, res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)
        const userAddress = await Address.findOne({ userId: userId })
        res.render('userAddress', { user: userData, userAddress })
    } catch (error) {
        console.log('error in rendering aDDRESS PAGE', error.message)
    }
}


const addAddress = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findOne({ _id: user })
        res.render('add-address', { user: userData })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findOne({ _id: userId })
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body

        const userAddress = await Address.findOne({ userId: userData._id })
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
            })
            await newAddress.save()
        } else {
            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone })
            await userAddress.save()
        }
        res.redirect('/userProfile')
    } catch (error) {
        console.log('Error in adding address', error)

        res.redirect('/pageNotFound')
    }
}

const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id
        const userId = req.session.user
        const userData = await User.findById(userId)
        const currAddress = await Address.findOne({
            'address._id': addressId
        })

        if (!currAddress) {
            return res.redirect('/pageNotFound')
        }

        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString()
        })

        if (!addressData) {
            return res.redirect('/pageNotFound')
        }

        res.render('edit-address', { address: addressData, user: userData })

    } catch (error) {
        console.error('Error in edit address', error)
        res.redirect('/pageNotFound')
    }
}

const postEditAddress = async (req, res) => {
    try {
        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({ 'address._id': addressId })
        if (!findAddress) {
            res.redirect('/pageNotFound')
        }
        await Address.updateOne(
            { 'address._id': addressId },
            {
                $set: {
                    'address.$': {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        landMark: data.landMark,
                        state: data.state,
                        pincode: data.pincode,
                        phone: data.phone,
                        altPhone: data.altPhone
                    }
                }
            }
        )
        res.redirect('/userProfile')
    } catch (error) {
        console.error('Error in edit Addresss', error)
        res.redirect('/pageNotFound')
    }
}

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id
        const findAddress = await Address.findOne({ 'address._id': addressId })
        if (!findAddress) {
            return res.status(404).send('Address not found')
        }

        await Address.updateOne({
            'address._id': addressId
        },
            {
                $pull: {
                    address: {
                        _id: addressId
                    }
                }
            }
        )

        res.redirect('/userProfile')
    } catch (error) {
        console.log('Error in deleting address', error)
        res.redirect('/pageNotFound')
    }
}

const uploadProfile = async (req, res) => {
    try {
        const userId = req.session.user
        const image = req.file.filename;

        if (!image) {
            return res.status(400).send('No image uploaded');
        }

        await User.findByIdAndUpdate(userId, { profileImage: image });

        res.redirect('/userProfile');
    } catch (error) {
        console.error('Profile image upload failed:', error);
        res.status(500).send('Internal server error');
    }
};

const getChangeName = async (req, res) => {
    try {
        const userId = req.session.user
        const user = await User.findById(userId)
        res.render('changeName', { user })
    } catch (error) {
        console.log('error in getchangeName')
    }
}

const updateProfileName = async (req, res) => {
    try {
        const userId = req.session.user; // assuming this is user ID, or adjust accordingly
        const { profileName } = req.body;

        if (!profileName || profileName.trim() === '') {
            return res.status(400).send('Profile name is required');
        }

        const trimmedName = profileName.trim();

        // Get current user data
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if new name is the same as current name (case insensitive)
        if (user.name.trim().toLowerCase() === trimmedName.toLowerCase()) {
            return res.status(400).send('Please enter a new profile name');
        }

        // Update the name
        await User.findByIdAndUpdate(userId, { name: trimmedName });

        console.log('Profile name updated:', trimmedName);
        res.status(200).send('Profile name updated successfully');
    } catch (error) {
        console.error('Error updating profile name:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    getForgotPassPage,
    forgotEmailvalid,
    sendVerificationEmail,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailvalid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    resendChangePasswordOtp,
    userAddress,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    uploadProfile,
    getChangeName,
    updateProfileName
}