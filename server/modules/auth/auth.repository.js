import User from "@/server/models/user.model";

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

export async function findUserByEmail(email) {
    return User.findOne({ email: normalizeEmail(email) })
        .select("+password +refreshTokenHash +refreshTokenExpiresAt")
        .exec();
}

export async function findUserById(userId) {
    return User.findById(userId)
        .select("+password +refreshTokenHash +refreshTokenExpiresAt")
        .exec();
}

export async function createUser(input) {
    const now = new Date();
    return User.create({
        email: normalizeEmail(input.email),
        password: input.password,
        name: input.name || "",
        role: "user",
        lastOnlineAt: now,
        lastLoginAt: now,
    });
}

export async function updateRefreshToken(userId, refreshTokenHash, refreshTokenExpiresAt, extra = {}) {
    return User.findByIdAndUpdate(
        userId,
        {
            refreshTokenHash,
            refreshTokenExpiresAt,
            lastOnlineAt: new Date(),
            ...extra,
        },
        { new: true }
    ).exec();
}

export async function clearRefreshToken(userId) {
    return User.findByIdAndUpdate(
        userId,
        {
            refreshTokenHash: null,
            refreshTokenExpiresAt: null,
        },
        { new: true }
    ).exec();
}
