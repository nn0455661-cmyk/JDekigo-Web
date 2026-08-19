import User from "@/server/models/user.model";

export async function findUserProfileById(userId) {
    return User.findByIdAndUpdate(userId, { lastOnlineAt: new Date() }, { new: true })
        .select("email role name avatar level phone birthday gender location goal preferredStudyTime studyStreak completedLessons completedMocks accuracy nextTarget lastOnlineAt lastLoginAt createdAt updatedAt")
        .lean()
        .exec();
}

export async function findUserAuthById(userId) {
    return User.findById(userId)
        .select("+password +refreshTokenHash +refreshTokenExpiresAt")
        .exec();
}

export async function updateUserProfileById(userId, input) {
    return User.findByIdAndUpdate(
        userId,
        {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.gender !== undefined ? { gender: input.gender } : {}),
            ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.goal !== undefined ? { goal: input.goal } : {}),
            ...(input.preferredStudyTime !== undefined ? { preferredStudyTime: input.preferredStudyTime } : {}),
            ...(input.level !== undefined ? { level: input.level } : {}),
            ...(input.birthday !== undefined ? { birthday: input.birthday } : {}),
        },
        { new: true }
    )
        .select("email role name avatar level phone birthday gender location goal preferredStudyTime studyStreak completedLessons completedMocks accuracy nextTarget lastOnlineAt lastLoginAt createdAt updatedAt")
        .exec();
}

export async function updateUserPasswordById(userId, password) {
    return User.findByIdAndUpdate(
        userId,
        {
            password,
        },
        { new: true }
    )
        .select("email role name avatar level phone birthday gender location goal preferredStudyTime studyStreak completedLessons completedMocks accuracy nextTarget lastOnlineAt lastLoginAt createdAt updatedAt")
        .exec();
}

export async function updateUserRoleById(userId, role) {
    return User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, select: "email role name avatar phone lastOnlineAt lastLoginAt createdAt updatedAt" }
    ).lean().exec();
}

export async function findUsers({ filter, skip, limit }) {
    const [users, total] = await Promise.all([
        User.find(filter)
            .select("email role name avatar phone lastOnlineAt lastLoginAt createdAt updatedAt")
            .sort({ lastOnlineAt: -1, lastLoginAt: -1, updatedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
        User.countDocuments(filter).exec(),
    ]);

    return { users, total };
}
