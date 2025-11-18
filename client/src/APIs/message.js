import { axiosInstance } from "./axiosInstance.js";

export const newMessage = async (message) => {
    try {
        const response = await axiosInstance.post('/message/new-message', message);
        return response.data;
    }
    catch (error) {
        return error;
    }
}
export const getMessages = async (chatId) => {
    try {
        const response = await axiosInstance.get(`/message/get-messages/${chatId}`);
        return response.data;
    }
    catch (error) {
        return error;
    }
}