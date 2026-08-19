import api from "src/lib/axios";

export async function getMe() {
    const res = await api.get("/api/user/me");
    return res.data;
}

export async function updateMe(payload) {
    const res = await api.patch("/api/user/me", payload);
    return res.data;
}

export async function changePassword(payload) {
    const res = await api.post("/api/user/me/password", payload);
    return res.data;
}

const userService = { getMe, updateMe, changePassword };

export default userService;
