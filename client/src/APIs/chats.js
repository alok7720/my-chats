import { axiosInstance } from "./axiosInstance.js";

export const allChats = async () => {
    try {
        const response = await axiosInstance.get('/chat/all-chats');
        return response.data;
    } catch (error) {
        return error;
    }
}
export const newChats = async (members) => {
    try {
        const response = await axiosInstance.post('/chat/new-chat',{members} );
        return response.data;
    } catch (error) {
        return error;
    }
}
export const clearUnreadMessageCount = async (chatId) => {
    try {
        const response = await axiosInstance.post('/chat/clear-unread-message',{chatId : chatId} );
        return response.data;
    } catch (error) {
        return error;
    }
}