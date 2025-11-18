import express from 'express';
import bcrypt from 'bcryptjs';

import User from '../models/userModel.js';
import {authMiddleware} from './authMiddleware.js';

const router = express.Router();

//GET details of the logged-in user
router.get('/details', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user.id });

        res.send({
            message: "User details fetched successfully.",
            success: true,
            data: user
        });
    } catch (error) {
        console.log('Error in /details in userController.');
        res.send({
            message: error.message,
            success: false
        });
    }
});

//Get details of all the other users
router.get('/all-users', authMiddleware, async (req, res) => {
    try {
        const allUsers = await User.find({ _id: {$ne: req.user.id} }).select("-password");

        res.send({
            message: "All users details fetched successfully.",
            success: true,
            data: allUsers
        });
    } catch (error) {
        console.error("Error in fetching all users.");
        res.send({
            message: error.message,
            success: false
        });
    }
});

// UPDATE USER PROFILE
router.post('/update-user', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, password, profilePic } = req.body;

        const updateData = {};

        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (profilePic) updateData.profilePic = profilePic;
        if (password){ 
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        } 

        const updatedUser = await User.findByIdAndUpdate( req.user.id,updateData,{ new: true }).select("-password"); // don't return password to frontend

        res.send({
            success: true,
            message: "Profile updated successfully.",
            data: updatedUser
        });

    } catch (error) {
        console.log("Error in update-user controller");
        res.send({
            success: false,
            message: error.message
        });
    }
});


router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.json({ success: false, message: 'Missing details.' });
        }
        const user = await User.findOne({email});
        if(!user){
            res.json({success:false, message: "User does not exist."});
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.json({success:true, message : "Password changed successfully."});

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        });
    }
});

export default router;