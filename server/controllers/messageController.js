import express from 'express';

import {authMiddleware} from './authMiddleware.js';
import Chat from '../models/chatModel.js';
import Message from '../models/messageModel.js';

const router = express.Router();

//POST API to send a message to another user
router.post('/new-message', authMiddleware, async (req, res) => {
    try {
        //Store the message in the "message" collection in the database
        const newMessage = new Message(req.body);
        const savedMessage = await newMessage.save();

        //Update the "lastMessage" in the chats collection
        const currentChat = await Chat.findByIdAndUpdate(req.body.chatId, { lastMessage: savedMessage._id, $inc: { unreadMessageCount: 1 } });

        res.status(201).send({
            message: "Message sent.",
            success: true,
            data: savedMessage
        });

    } catch (error) {
        console.log('Error in new-message controller.');
        res.status(400).send({
            message: error.message,
            success: false
        });
    }
});

//GET API to receive all the sent messages of the logged-in user
router.get('/get-messages/:chatId', authMiddleware, async (req, res) => {
    try {
        //Get all the messages from the route parameters of the request
        const allMsg = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });

        res.status(200).send({
            message: "Messages fetched.",
            success: true,
            data: allMsg
        });

    } catch (error) {
        console.log("Error in getMessages controller.");
        res.status(400).send({
            message: error.message,
            success: false
        });
    }
});

export default router;