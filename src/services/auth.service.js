import api from "src/lib/axios";

export async function login(payload) {
    const res = await api.post("/api/auth/login", payload);
    return res.data;
}

export async function register(payload) {
    const res = await api.post("/api/auth/register", payload);
    return res.data;
}

export async function refresh() {
    const res = await api.post("/api/auth/refresh");
    return res.data;
}

export async function logout() {
    const res = await api.post("/api/auth/logout");
    return res.data;
}

const authService = { login, register, refresh, logout };

export default authService;
