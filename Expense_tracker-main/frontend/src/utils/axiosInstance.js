import axios from "axios";
import { BASE_URL } from "./apiPath";

const axiosInstance = axios.create({
   baseURL: BASE_URL,
   timeout: 10000,
   headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
   },
});

axiosInstance.interceptors.request.use(
   (config) => {
      const accessToken = localStorage.getItem("token");
      if (accessToken) {
         config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
   },
   (error) => {
      return Promise.reject(error);
   }
);

axiosInstance.interceptors.request.use(
   (response) => {
      return response;
   },
   (error) => {
      if(error.response) {
         if(error.response.status === 401 ) {
            window.location.href = '/login' ;
         }else if (error.response.status === 500 ){
            console.log('Internal Server Error. Please try again');
         }
      }else if (error.code === "ECONNABORATED") {
         console.log('Network Error. Please try again');
      }
      return Promise.reject(error);
   }
);

export default axiosInstance;