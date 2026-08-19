import api from "src/lib/axios";

export async function getImages() {
    const res = await api.get("/api/assets/images");
    return res.data;
}

const assetsService = { getImages };

export default assetsService;
