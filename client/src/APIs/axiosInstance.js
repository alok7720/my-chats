import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:  process.env.REACT_APP_MODE === "development"?"http://localhost:5000/":"/",
  withCredentials: true,
});