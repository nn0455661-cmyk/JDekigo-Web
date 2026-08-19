import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import { comparePassword, hashPassword } from "@/server/lib/bcrypt";
import { findUserAuthById, findUserProfileById, updateUserPasswordById, updateUserProfileById, findUsers, updateUserRoleById } from "./user.repository";

export async function getCurrentUser(userId) {
    await connectMongo();

    const user = await findUserProfileById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    return user;
}

export async function updateCurrentUserProfile(userId, input) {
    await connectMongo();

    const user = await updateUserProfileById(userId, input);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    return user;
}

export async function changeCurrentUserPassword(userId, input) {
    await connectMongo();

    if (input.nextPassword !== input.confirmPassword) {
        throw new AppError("Mật khẩu mới và xác nhận mật khẩu không khớp", 400, "PASSWORD_MISMATCH");
    }

    const user = await findUserAuthById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    const passwordMatches = await comparePassword(input.currentPassword, user.password);

    if (!passwordMatches) {
        throw new AppError("Mật khẩu hiện tại không đúng", 400, "CURRENT_PASSWORD_INVALID");
    }

    const hashedPassword = await hashPassword(input.nextPassword);
    const updatedUser = await updateUserPasswordById(userId, hashedPassword);

    if (!updatedUser) {
        throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    return updatedUser;
}

export async function getAdminUsers(authUserId, queryParams) {
    await connectMongo();

    const { page = 1, limit = 10, search = "", role = "" } = queryParams;

    const filter = {};

    if (role && role !== "all") {
        filter.role = { $regex: new RegExp(`^${role}$`, "i") };
    }

    if (search) {
        filter.$or = [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
        ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const { users, total } = await findUsers({ filter, skip, limit: limitNum });

    return {
        users,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
    };
}

export async function changeUserRole(authUserId, targetUserId, newRole) {
    await connectMongo();

    if (authUserId === targetUserId) {
        throw new AppError("Không thể tự thay đổi quyền của bản thân", 400, "CANNOT_UPDATE_SELF");
    }

    const validRoles = ["user", "admin"];
    if (!validRoles.includes(newRole.toLowerCase())) {
        throw new AppError("Quyền không hợp lệ", 400, "INVALID_ROLE");
    }

    const updatedUser = await updateUserRoleById(targetUserId, newRole.toLowerCase());

    if (!updatedUser) {
        throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    return updatedUser;
}
