import { axiosInstance } from "./axiosInstance.js";

// API endpoint function to fetch the details of the logged-in user
export const userDetails = async () => {
    try {
        const response = await axiosInstance.get('/user/details');
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint to fetch all the other registered users
export const allUsersDetails = async () => {
    try {
        const response = await axiosInstance.get('/user/all-users');
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to update the user profile
export const updateUser = async (user) => {
    try {
        const response = await axiosInstance.post('/user/update-user',user);
        return response.data;
    } catch (error) {
        return error;
    }
}

// API endpoint function to reset password
export const resetPassword = async ({email, newPassword}) => {
    try {
        const response = await axiosInstance.post('/user/reset-password',{email, newPassword});
        return response.data;
    } catch (error) {
        return error;
    }
} 