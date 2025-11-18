import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
    chatId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Chat"
    },
    sender : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    text:{
        type : String,
        required : false
    },
    image:{
        type : String,
        required : false
    },
    read : {
        type : Boolean,
        default:false
    }
},{timestamps:true});

const Message = mongoose.model("Message", messageSchema);
export default Message;