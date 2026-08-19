import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import { comparePassword, hashPassword } from "@/server/lib/bcrypt";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "@/server/lib/jwt";
import { clearRefreshToken, createUser, findUserByEmail, findUserById, updateRefreshToken } from "./auth.repository";

function toSafeUser(user) {
    return {
        id: String(user._id),
        email: user.email,
        role: user.role,
        name: user.name || "",
        avatar: user.avatar || "",
        level: user.level || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
        gender: user.gender || "",
        location: user.location || "",
        goal: user.goal || "",
        preferredStudyTime: user.preferredStudyTime || "",
        studyStreak: user.studyStreak || 0,
        completedLessons: user.completedLessons || 0,
        completedMocks: user.completedMocks || 0,
        accuracy: user.accuracy || 0,
        nextTarget: user.nextTarget || "",
        lastOnlineAt: user.lastOnlineAt?.toISOString?.() || user.updatedAt?.toISOString?.() || user.createdAt?.toISOString?.() || new Date().toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString?.() || "",
        createdAt: user.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: user.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
}

function buildTokenPair(user) {
    const payload = {
        sub: String(user._id),
        email: user.email,
        role: user.role,
    };

    return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
    };
}

function getRefreshExpiryDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export async function registerUser(input) {
    await connectMongo();

    if (input.password !== input.confirmPassword) {
        throw new AppError("Passwords do not match", 400, "PASSWORD_MISMATCH");
    }

    const existingUser = await findUserByEmail(input.email);

    if (existingUser) {
        throw new AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
    }

    const password = await hashPassword(input.password);
    const user = await createUser({ email: input.email, password, name: input.name });
    const tokens = buildTokenPair(user);

    const updatedUser = await updateRefreshToken(user.id, hashToken(tokens.refreshToken), getRefreshExpiryDate());

    return {
        user: toSafeUser(updatedUser || user),
        tokens,
    };
}

export async function loginUser(input) {
    await connectMongo();

    const user = await findUserByEmail(input.email);

    if (!user) {
        throw new AppError("Email hoặc password không đúng", 401, "INVALID_CREDENTIALS");
    }

    const passwordMatches = await comparePassword(input.password, user.password);

    if (!passwordMatches) {
        throw new AppError("Email hoặc password không đúng", 401, "INVALID_CREDENTIALS");
    }

    const tokens = buildTokenPair(user);
    const updatedUser = await updateRefreshToken(user.id, hashToken(tokens.refreshToken), getRefreshExpiryDate(), { lastLoginAt: new Date() });

    return {
        user: toSafeUser(updatedUser || user),
        tokens,
    };
}

export async function refreshSession(refreshToken) {
    await connectMongo();

    const payload = verifyRefreshToken(refreshToken);
    const user = await findUserById(payload.sub);

    if (!user || !user.refreshTokenHash) {
        throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const currentHash = hashToken(refreshToken);

    if (currentHash !== user.refreshTokenHash) {
        throw new AppError("Refresh token has been rotated", 401, "REFRESH_TOKEN_ROTATED");
    }

    if (user.refreshTokenExpiresAt && new Date(user.refreshTokenExpiresAt).getTime() < Date.now()) {
        throw new AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const tokens = buildTokenPair(user);
    const updatedUser = await updateRefreshToken(user.id, hashToken(tokens.refreshToken), getRefreshExpiryDate());

    return {
        user: toSafeUser(updatedUser || user),
        tokens,
    };
}

export async function logoutUser(refreshToken) {
    if (!refreshToken) {
        return { success: true };
    }

    await connectMongo();

    try {
        const payload = verifyRefreshToken(refreshToken);
        await clearRefreshToken(payload.sub);
    } catch {
        // Ignore invalid refresh tokens during logout.
    }

    return { success: true };
}
