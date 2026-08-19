import api from "src/lib/axios";
import { clearClientCache } from "@/src/lib/client-cache";

async function unwrap(response) {
    return response.data?.data ?? response.data;
}

export async function listAdminLessons(params = {}) {
    const response = await api.get("/api/admin/lessons", { params });
    return unwrap(response);
}

export async function getAdminLesson(id) {
    const response = await api.get(`/api/admin/lessons/${id}`);
    return unwrap(response);
}

export async function createAdminLesson(payload) {
    const response = await api.post("/api/admin/lessons", payload);
    clearClientCache();
    return unwrap(response);
}

export async function updateAdminLesson(id, payload) {
    const response = await api.patch(`/api/admin/lessons/${id}`, payload);
    clearClientCache();
    return unwrap(response);
}

export async function deleteAdminLesson(id) {
    const response = await api.delete(`/api/admin/lessons/${id}`);
    clearClientCache();
    return unwrap(response);
}

export async function listAdminContent(params = {}) {
    const response = await api.get("/api/admin/content", { params });
    return unwrap(response);
}

export async function getAdminContent(module, id) {
    const response = await api.get(`/api/admin/content/${id}`, { params: { module } });
    return unwrap(response);
}

export async function createAdminContent(payload) {
    const response = await api.post("/api/admin/content", payload);
    clearClientCache();
    return unwrap(response);
}

export async function uploadAdminImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/assets/images", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return unwrap(response);
}

export async function deleteAdminImage(payload) {
    const body = typeof payload === "string" ? { url: payload } : payload;
    const response = await api.delete("/api/assets/images", { data: body });
    return unwrap(response);
}

async function uploadAdminAudioThroughServer(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/assets/audio", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return unwrap(response);
}

async function calculateFileSha256(file) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function uploadAdminAudio(file) {
    try {
        const sha256 = await calculateFileSha256(file);
        const response = await api.get("/api/assets/audio/presign", {
            params: {
                fileName: file.name,
                contentType: file.type,
                size: file.size,
                sha256,
            },
        });
        const data = await unwrap(response);
        const uploadResponse = await fetch(data.uploadUrl, {
            method: data.method || "PUT",
            headers: data.headers || { "Content-Type": file.type },
            body: file,
        });

        if (!uploadResponse.ok) {
            throw new Error(`R2 direct upload failed with HTTP ${uploadResponse.status}`);
        }

        return data;
    } catch {
        // Buckets without browser PUT CORS support keep working through the
        // authenticated Next.js upload endpoint.
        return uploadAdminAudioThroughServer(file);
    }
}

export async function deleteAdminAudio(payload) {
    const body = typeof payload === "string" ? { id: payload } : payload;
    const response = await api.delete("/api/assets/audio", { data: body });
    return unwrap(response);
}

export async function updateAdminContent(module, id, payload) {
    const response = await api.patch(`/api/admin/content/${id}`, { ...payload, module });
    clearClientCache();
    return unwrap(response);
}

export async function deleteAdminContent(module, id) {
    const response = await api.delete(`/api/admin/content/${id}`, { params: { module } });
    clearClientCache();
    return unwrap(response);
}

export async function listTests(params = {}) {
    const response = await api.get("/api/tests", { params: { ...params, includeDrafts: true } });
    return unwrap(response);
}

export async function getTest(id) {
    const response = await api.get(`/api/tests/${id}`);
    return unwrap(response);
}

export async function createTest(payload) {
    const response = await api.post("/api/tests", payload);
    return unwrap(response);
}

export async function updateTest(id, payload) {
    const response = await api.patch(`/api/tests/${id}`, payload);
    return unwrap(response);
}

export async function deleteTest(id) {
    const response = await api.delete(`/api/tests/${id}`);
    return unwrap(response);
}

export async function listMiniTestGroups(params = {}) {
    const response = await api.get("/api/mini-test-groups", { params: { ...params, includeDrafts: true } });
    return unwrap(response);
}

export async function createMiniTestGroup(payload) {
    const response = await api.post("/api/mini-test-groups", payload);
    return unwrap(response);
}

export async function updateMiniTestGroup(id, payload) {
    const response = await api.patch(`/api/mini-test-groups/${id}`, payload);
    return unwrap(response);
}

export async function deleteMiniTestGroup(id) {
    const response = await api.delete(`/api/mini-test-groups/${id}`);
    return unwrap(response);
}

// Question bank APIs (mock_test)
export async function listQuestions(params = {}) {
    const response = await api.get("/api/questions", { params: { ...params, includeDrafts: true } });
    return unwrap(response);
}

export async function getQuestion(id) {
    const response = await api.get(`/api/questions/${id}`);
    return unwrap(response);
}

export async function createQuestion(payload) {
    const response = await api.post(`/api/questions`, payload);
    return unwrap(response);
}

export async function updateQuestion(id, payload) {
    const response = await api.patch(`/api/questions/${id}`, payload);
    return unwrap(response);
}

export async function deleteQuestion(id) {
    const response = await api.delete(`/api/questions/${id}`);
    return unwrap(response);
}

export async function getMockTestConfig(level) {
    const response = await api.get("/api/mock-test-config", {
        params: { level, _: Date.now() },
        headers: { "Cache-Control": "no-cache" },
    });
    return unwrap(response);
}

export async function updateMockTestConfig(level, distribution, timeLimit) {
    const response = await api.patch("/api/mock-test-config", { level, distribution, timeLimit });
    return unwrap(response);
}
