import { axiosInstance} from "./axiosInstance.js";

//Authorizaton API for SignUp
export const signupUser = async (user) => {
    try {
        const response = await axiosInstance.post('/auth/signup', user);
        return response.data;
    } catch (error) {
        return error;
    }
}

//Authorizaton API for login
export const loginUser = async (user) => {
    try {
        const response = await axiosInstance.post('/auth/login', user);
        return response.data;
    } catch (error) {
        return error;
    }
}

//Authorizaton API for logout
export const logoutUser = async () => {
    try {
        const response = await axiosInstance.post('/auth/logout');
        return response.data;
    } catch (error) {
        return error;
    }
}

//Authorization API for does-user-exist
export const doesUserExist = async ({email})=>{
    try {
        const response = await axiosInstance.post('/auth/does-user-exist', {email});
        return response.data;
    } catch (error) {
        return error;
    }
}

//Authorization API to send OTP
export const sendOTP = async ({email, type})=>{
    try {
        const response = await axiosInstance.post('/auth/send-otp', {email, type});
        return response.data;
    } catch (error) {
        return error;
    }
}

//Authorization API to verify otp
export const verifyOTP = async ({email, otp})=>{
    try {
        const response = await axiosInstance.post('/auth/verify-otp', {email, otp});
        return response.data;
    } catch (error) {
        return error;
    }
}

// Authorization API to check if user is blocked
export const isUserBlocked = async ({email})=>{
    try {
        const response = await axiosInstance.post('/auth/is-user-blocked', {email});
        return response.data;
    } catch (error) {
        return error;
    }
}