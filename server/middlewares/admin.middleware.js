import { AppError } from "@/server/utils/error";
import { connectMongo } from "@/server/lib/mongoose";
import User from "@/server/models/user.model";
import { requireAuth } from "./auth.middleware";

export async function requireAdmin(request) {
    const auth = await requireAuth(request);
    await connectMongo();

    const user = await User.findById(auth.userId).select("role").lean().exec();

    if (String(user?.role || "").trim().toLowerCase() !== "admin") {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return { ...auth, role: "admin" };
}
