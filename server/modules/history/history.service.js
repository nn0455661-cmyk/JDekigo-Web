import TestHistory from "@/server/models/history.model";
import { connectMongo } from "@/server/lib/mongoose";
import User from "@/server/models/user.model";
import Test from "@/server/models/test.model";
import mongoose from "mongoose";

export async function createHistoryRecord(userId, data) {
    await connectMongo();

    const record = new TestHistory({
        userId,
        module: data.module,
        level: data.level,
        testId: data.testId,
        testTitle: data.testTitle,
        type: data.type,
        mockTestType: data.mockTestType,
        testKind: data.testKind,
        miniTestGroupId: data.miniTestGroupId,
        correct: data.correct || 0,
        total: data.total || 0,
        percentage: data.percentage || 0,
        durationSeconds: data.durationSeconds || 0,
        questions: data.questions,
        answers: data.answers,
    });

    await record.save();
    return record;
}

function resolveMockTestType(historyItem, testMap = new Map()) {
    if (historyItem?.module !== "mock-test") {
        return historyItem?.mockTestType;
    }

    if (historyItem?.mockTestType === "full" || historyItem?.mockTestType === "mini") {
        return historyItem.mockTestType;
    }

    if (historyItem?.miniTestGroupId) {
        return "mini";
    }

    const testMeta = testMap.get(String(historyItem?.testId || ""));
    if (testMeta?.miniTestGroupId) {
        return "mini";
    }

    if (testMeta?.testKind === "module_exam" && testMeta?.module === "mock_test") {
        return "full";
    }

    return "";
}

async function enrichMockHistoryRows(rows) {
    const testIds = rows
        .filter((item) => item?.module === "mock-test" && item?.testId)
        .map((item) => String(item.testId))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!testIds.length) {
        return rows.map((item) => ({ ...item, mockTestType: resolveMockTestType(item) }));
    }

    const tests = await Test.find({ _id: { $in: testIds } })
        .select("_id module testKind miniTestGroupId")
        .lean()
        .exec();
    const testMap = new Map(tests.map((test) => [
        String(test._id),
        {
            module: test.module,
            testKind: test.testKind,
            miniTestGroupId: test.miniTestGroupId ? String(test.miniTestGroupId) : "",
        },
    ]));

    return rows.map((item) => ({ ...item, mockTestType: resolveMockTestType(item, testMap) }));
}

export async function getUserHistory(userId, queryParams) {
    await connectMongo();

    const { module, level, limit = 10, page = 1 } = queryParams;
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (module) filter.module = module;
    if (level) filter.level = level;

    const [data, total] = await Promise.all([
        TestHistory.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
        TestHistory.countDocuments(filter),
    ]);

    return {
        data,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
    };
}

export async function getAdminUserHistory(userId, queryParams) {
    await connectMongo();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return null;
    }

    const { module, level, limit = 100, page = 1 } = queryParams;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findById(userId)
        .select("email role name avatar phone createdAt")
        .lean()
        .exec();

    if (!user) {
        return null;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userFilterValue = { $in: [userObjectId, userId] };
    const filter = { userId: userFilterValue };
    if (module) filter.module = module;
    if (level) filter.level = level;

    const baseFilter = { userId: userFilterValue };

    const [rawData, total, summaryRows, overallRows] = await Promise.all([
        TestHistory.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        TestHistory.countDocuments(filter),
        TestHistory.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$module",
                    attempts: { $sum: 1 },
                    correct: { $sum: { $ifNull: ["$correct", 0] } },
                    total: { $sum: { $ifNull: ["$total", 0] } },
                    durationSeconds: { $sum: { $ifNull: ["$durationSeconds", 0] } },
                    latestAt: { $max: "$createdAt" },
                },
            },
            { $sort: { attempts: -1, _id: 1 } },
        ]),
        TestHistory.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: null,
                    attempts: { $sum: 1 },
                    correct: { $sum: { $ifNull: ["$correct", 0] } },
                    total: { $sum: { $ifNull: ["$total", 0] } },
                    durationSeconds: { $sum: { $ifNull: ["$durationSeconds", 0] } },
                },
            },
        ]),
    ]);

    const data = await enrichMockHistoryRows(rawData);

    const totals = summaryRows.reduce(
        (acc, row) => ({
            attempts: acc.attempts + row.attempts,
            correct: acc.correct + row.correct,
            total: acc.total + row.total,
            durationSeconds: acc.durationSeconds + row.durationSeconds,
        }),
        { attempts: 0, correct: 0, total: 0, durationSeconds: 0 }
    );

    const summaryByModule = summaryRows.map((row) => ({
        module: row._id || "unknown",
        attempts: row.attempts,
        correct: row.correct,
        total: row.total,
        durationSeconds: row.durationSeconds,
        percentage: row.total ? Math.round((row.correct / row.total) * 100) : 0,
        latestAt: row.latestAt,
    }));

    return {
        user,
        data,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
            ...totals,
            percentage: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
            byModule: summaryByModule,
        },
        overallSummary: {
            attempts: overallRows[0]?.attempts || 0,
            correct: overallRows[0]?.correct || 0,
            total: overallRows[0]?.total || 0,
            durationSeconds: overallRows[0]?.durationSeconds || 0,
            percentage: overallRows[0]?.total ? Math.round((overallRows[0].correct / overallRows[0].total) * 100) : 0,
        },
    };
}

function getVietnamDateRange(dateValue = "") {
    const now = new Date();
    const fallbackParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);

    const fallbackByType = Object.fromEntries(fallbackParts.map((part) => [part.type, part.value]));
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || "")) ? String(dateValue) : `${fallbackByType.year}-${fallbackByType.month}-${fallbackByType.day}`;
    const [year, month, day] = normalizedDate.split("-").map(Number);
    const timezoneOffsetMs = 7 * 60 * 60 * 1000;
    const start = new Date(Date.UTC(year, month - 1, day) - timezoneOffsetMs);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return { start, end, date: normalizedDate };
}

export async function getAdminStatisticsOverview({ date } = {}) {
    await connectMongo();

    const { start, end, date: selectedDate } = getVietnamDateRange(date);
    const dateFilter = {
        createdAt: { $gte: start, $lt: end },
    };

    const [todayRows, todayTotalRows, topUsers] = await Promise.all([
        TestHistory.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        module: "$module",
                        userId: "$userId",
                    },
                    attempts: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: "$_id.module",
                    users: { $sum: 1 },
                    attempts: { $sum: "$attempts" },
                },
            },
            { $sort: { users: -1, attempts: -1, _id: 1 } },
        ]),
        TestHistory.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    attempts: { $sum: 1 },
                    userIds: { $addToSet: "$userId" },
                },
            },
            {
                $project: {
                    _id: 0,
                    attempts: 1,
                    users: { $size: "$userIds" },
                },
            },
        ]),
        TestHistory.aggregate([
            {
                $group: {
                    _id: "$userId",
                    attempts: { $sum: 1 },
                    correct: { $sum: { $ifNull: ["$correct", 0] } },
                    total: { $sum: { $ifNull: ["$total", 0] } },
                    latestAt: { $max: "$createdAt" },
                },
            },
            { $match: { total: { $gt: 0 } } },
            {
                $addFields: {
                    percentage: {
                        $round: [{ $multiply: [{ $divide: ["$correct", "$total"] }, 100] }, 0],
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $match: { "user.role": "user" } },
            { $sort: { percentage: -1, correct: -1, attempts: -1, latestAt: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    name: "$user.name",
                    email: "$user.email",
                    avatar: "$user.avatar",
                    attempts: 1,
                    correct: 1,
                    total: 1,
                    percentage: 1,
                    latestAt: 1,
                },
            },
        ]),
    ]);

    const todayTotal = todayTotalRows[0] || { users: 0, attempts: 0 };

    return {
        today: {
            date: selectedDate,
            users: todayTotal.users || 0,
            attempts: todayTotal.attempts || 0,
            byModule: todayRows.map((row) => ({
                module: row._id || "unknown",
                users: row.users || 0,
                attempts: row.attempts || 0,
            })),
        },
        topUsers,
    };
}
