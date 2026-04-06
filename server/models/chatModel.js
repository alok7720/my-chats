import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    members: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    unreadMessageCount: {
        type: Number,
        default: 0
    },
    isBlocked: {
        type: Boolean
    },
    blockedBy :{
        type : mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
}, { timestamps: true });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;