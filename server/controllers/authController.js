import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/userModel.js';
import transporter,{AUTH_MAIL_TEMPLATE, PASSWORD_RESET_TEMPLATE} from '../lib/mailer.js';

const router = express.Router();

// Global in-memory OTP store
const otp_map = {};
const blocked_user = {};
const login_blocked = {};

const generateToken = (userId, res) => {
    const jwtToken = jwt.sign({ userId }, process.env.JWT_KEY, {expiresIn: "15d",});

    res.cookie("token", jwtToken, {
        maxAge: 15 * 24 * 60 * 60 * 1000, // MS
        httpOnly: true, // prevent XSS attacks cross-site scripting attacks
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: process.env.MODE !== "development",
    });

    return jwtToken;
};

router.post('/is-user-blocked', async (req, res)=>{
    try {
        const {email} = req.body;
        if(!email) return res.json({success:false, message:"Email is required."});
        if(blocked_user[email]) return res.json({isBlocked:true, message : "User is blocked."});
        return res.json({isBlocked:false, message:"User is not blocked."});
    } catch (error) {
        console.log("Error in is-user-blocked controller.");
        res.send({
            success:false,
            message: error.message
        });
    }
});

router.post('/does-user-exist', async (req, res)=>{
    //Check whether user exists or not
    try {
        const {email} = req.body;
        if(!email) return res.json({success:false,message: "Email is required."});
        const user = await User.findOne({ email });
        if (user) {
            return res.send({
                message: "User already exists with this email id.",
                exists: true
            })
        }
        return res.send({message:"User doesn't exist.", exists:false});
    } catch (error) {
        console.log("Error in does-user-exist controller.");
        res.send({message:error.message, success:false});
    }        
});

router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password, profilePic } = req.body;
    try {
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be of at least 8 characters." });
        }
        
        //whether user already exists or not will be done by "/does-user-exist"
        //If the user doesn't exist, encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);

        //Create the new user in the db
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            profilePic
        });

        if (newUser) {
            // generate jwt token here
            await newUser.save();
            generateToken(newUser._id, res);
            res.send({
                message: "User created successfully !",
                success: true,
                _id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            })
        }
    } catch (error) {
        console.log("Error in signup controller");
        res.send({
            message: error.message,
            success: false
        })
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password){
        res.json({success: false, message:"Missing details."});
    }
    try {
        //check whether user exists or not
        const user = await User.findOne({ email });
        if (!user) {
            return res.send({
                message: "User doesn't exist.",
                success: false
            })
        }
        // BLOCK CHECK
        if (login_blocked[email] && login_blocked[email].blockedTill > Date.now()) {
            return res.send({
            success: false,
            message: "Too many invalid attempts. Try again later."
        });
        }

        // CLEAR EXPIRED BLOCK
        if (login_blocked[email] && login_blocked[email].blockedTill <= Date.now()) {
            delete login_blocked[email];
        }

        //check whether password is correct or not
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            if (!login_blocked[email]) {
                login_blocked[email] = { attempts: 3 };
            }
            login_blocked[email].attempts -= 1;
            
            if (login_blocked[email].attempts <= 0) {
                login_blocked[email].blockedTill = Date.now() + (1 * 60 * 60 * 1000); // block for 1 hour
                login_blocked[email].attempts = 0;

                return res.send({
                    success: false,
                    message: "Too many failed attempts. You are blocked for 1 hour."
                });
            }
            return res.send({
                message: "Password is incorrect.",
                success: false
            })
        }

        //if both info is correct, generate JWT
        generateToken(user._id, res);
        res.send({
            message: "User logged in successfully.",
            success: true,
            // token: jwtToken
        });

    } catch (error) {
        console.log("Error in login controller");
        res.send({
            message: error.message,
            success: false
        })
    }
});

router.post('/logout', async (req, res) => {
    try {
        res.clearCookie('token')
        return res.json({ success: true, message: 'Logged out successfully !' });

    } catch (error) {
        console.log("Error in logout controller");
        return res.json({ success: false, message: error.message });
    }
});

router.post('/send-otp', async (req, res) => {
    try {
        const { email,type } = req.body;
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Check if OTP already exists for this email
        if (otp_map[email]) {
            return res.json({ success: true, message: "OTP already sent" });
        }

        // generate an OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        
        // Store OTP and its expiry time
        otp_map[email] = {
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000,// 15 minutes
            attempt:3 
        };
        
        // Auto-remove the otp after 15 minutes
        setTimeout(() => {
                delete otp_map[email];
            }, 15 * 60 * 1000);

        //Send the OTP through an email
        const mailSubject = (type === "verify") ? "Account Verification OTP " : "Password Reset OTP";
        const mailText = (type === "verify") ? AUTH_MAIL_TEMPLATE.replace('{{otp}}',otp) : PASSWORD_RESET_TEMPLATE.replace('{{otp}}',otp);
        const mailOptions = {
            from : '"MyChats"alokraj69798999@gmail.com',
            to : email,
            subject : mailSubject ,
            html:mailText
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`An OTP sent to mail : ${email} :-: Message Id : ${info.messageId}`);
        res.send({ success: true, message: 'An OTP is sent to your mail.' });

    } catch (error) {
        console.log('Error in send OTP controller.');
        res.send({
            success: false,
            message: error.message
        });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const otpData = otp_map[email];

        // If no OTP exists → expired or never requested
        if (!otpData) {
            return res.json({ success: false, message: "OTP expired or not requested" });
        }

        // block the user due to too many attempts
        if (otpData.attempt <= 0) {
            blocked_user[email] = {blockedTill : Date.now() + 1 * 60 * 60 * 1000}
            
            // Auto-remove the block after 1 hour
            setTimeout(() => {
                delete blocked_user[email];
            }, 1 * 60 * 60 * 1000); // 1 hour in ms

            return res.json({
                isBlocked:true,
                success: false,
                message: "Too many invalid attempts, User is blocked for 1 hour."
            });
        }

        // Compare
        if (otpData.otp !== otp) {
            otpData.attempt -=1;
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // Check expiry
        if (Date.now() > otpData.expiresAt) {
            delete otp_map[email];
            return res.json({ success: false, message: "OTP expired" });
        }

        // OTP verified → delete it
        delete otp_map[email];
        return res.json({ success: true, message: "OTP verified successfully" });


    } catch (error) {
        console.log('Error in verify otp controller.');
        return res.json({ success: false, message: error.message });
    }
});

export default router;