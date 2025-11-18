import express from 'express';

import Chat from '../models/chatModel.js';
import Message from '../models/messageModel.js';
import {authMiddleware} from './authMiddleware.js';

const router = express.Router();

//Route to start a new chat with a user
router.post('/new-chat', authMiddleware, async (req, res)=>{
    try {
        //create new chat between two users
        const {members} = req.body;
        let chat = new Chat({members});
        const savedChat = await chat.save();
        
        // populate the members BEFORE returning to frontend
        chat = await Chat.findById(savedChat._id)
          .populate('members')
          .populate('lastMessage');

        res.status(201).send({
            message : "Chat created successfully.",
            success : true,
            data : chat
        })
        
    } catch (error) {
        console.log('Error in new-chat controller.');
        res.status(400).send({
            message : error.message,
            success:false
        })
    }
});

//Route to GET all chats of the user
router.get('/all-chats', authMiddleware, async (req, res)=>{
    try {
        //create new chat between two users
        const allChats = await Chat.find({members : {$in : req.user.id}}).populate('members').populate('lastMessage').sort({updatedAt : -1});

        res.status(200).send({
            message : "Chats fetched successfully.",
            success : true,
            data : allChats
        })
        
    } catch (error) {
        console.log('Error in all-chats controller.');
        res.status(400).send({
            message : error.message,
            success:false
        })
    }
});

router.post('/clear-unread-message', authMiddleware, async (req, res)=>{
    try {
        const chatId = req.body.chatId;

        // update the unread message count in the chat collection
        const chat = await Chat.findById(chatId);
        if(!chat){
            res.send({
                message:'No chat found for the given chat Id',
                success:false
            });
        }
        const updatedChat  = await Chat.findByIdAndUpdate(chatId, {unreadMessageCount:0}, {new: true}).populate('members').populate('lastMessage');

        //update the read property to true in message collection
        await Message.updateMany({chatId : chatId, read : false}, {read : true});

        res.send({
            success : true,
            message : 'Unread messages cleared successfully',
            data : updatedChat
        });

    } catch (error) {
        console.log('Error in clear-unread-message controller.');
        res.status(400).send({
                message : error.message,
                success:false
            })
    }
});

export default router;