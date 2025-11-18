import { axiosInstance } from "./axiosInstance.js";

export const userDetails = async () => {
    try {
        const response = await axiosInstance.get('/user/details');
        return response.data;
    } catch (error) {
        return error;
    }
} 
export const allUsersDetails = async () => {
    try {
        const response = await axiosInstance.get('/user/all-users');
        return response.data;
    } catch (error) {
        return error;
    }
} 
export const updateUser = async (user) => {
    try {
        const response = await axiosInstance.post('/user/update-user',user);
        return response.data;
    } catch (error) {
        return error;
    }
} 
export const resetPassword = async ({email, newPassword}) => {
    try {
        const response = await axiosInstance.post('/user/reset-password',{email, newPassword});
        return response.data;
    } catch (error) {
        return error;
    }
} 