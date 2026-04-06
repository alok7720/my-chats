import { axiosInstance } from "./axiosInstance.js";

// API endpoint function to send a message
export const newMessage = async (message) => {
    try {
        const response = await axiosInstance.post('/message/new-message', message);
        return response.data;
    }
    catch (error) {
        return error;
    }
}

// API endpoint function to get all messages of a chat
export const getMessages = async (chatId, skip = 0, limit = 100) => {
    try {
        const response = await axiosInstance.get(`/message/get-messages/${chatId}?skip=${skip}&limit=${limit}`);
        return response.data;
    }
    catch (error) {
        return error;
    }
}