import { axiosInstance } from "./axiosInstance.js";

// API endpoint function to get all Chats associated with the logged-in user
export const allChats = async () => {
    try {
        const response = await axiosInstance.get('/chat/all-chats');
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to create a new chat
export const newChats = async (members) => {
    try {
        const response = await axiosInstance.post('/chat/new-chat',{members} );
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to clear unread messages
export const clearUnreadMessageCount = async (chatId) => {
    try {
        const response = await axiosInstance.post('/chat/clear-unread-message',{chatId : chatId} );
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to block user
export const blockUser = async ({chatId, blockedBy})=>{
    try {
        const response = await axiosInstance.post('/chat/block-user', {chatId, blockedBy});
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to unblock a user
export const unblockUser = async ({chatId})=>{
    try {
        const response = await axiosInstance.post('/chat/unblock-user', {chatId});
        return response.data;
    } catch (error) {
        return error;
    }
}