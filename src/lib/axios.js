import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor: attach access_token from localStorage
if (typeof window !== "undefined") {
    api.interceptors.request.use(
        (config) => {
            try {
                const token = localStorage.getItem("jlearn_access_token");
                if (token) {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (e) {
                // ignore localStorage errors
            }

            return config;
        },
        (error) => Promise.reject(error)
    );
}

// Response interceptor: handle 401 globally (no UI redirect)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
