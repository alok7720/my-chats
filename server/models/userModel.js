import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName : {
        type : String,
        required : true
    },
    lastName : {
        type : String,
        required : true
    },
    email : {
        type : String,
        unique : true,
        required : true
    },
    password : {
        type : String,
        required : true,
    },
    profilePic : {
        type : String,
        required : false
    },
    profileUpdatedDate: {
        type: Date,
        default: new Date(0) // Allows immediate first-time update
    }
},{timestamps:true});

const User =  mongoose.model("User", userSchema);
export default User;