import { connectMongo } from "@/server/lib/mongoose";
import MiniTestGroup from "@/server/models/miniTestGroup.model";
import MockTestConfig from "@/server/models/mock-test-config.model";
import { getTests } from "@/server/modules/test/test.service";
import { getQuestions } from "@/server/modules/question/question.service";
import { errorResponse, successResponse } from "@/server/utils/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DISTRIBUTION = { vocabulary: 10, kanji: 8, grammar: 10, reading: 2 };
const QUESTION_CATEGORIES = ["vocabulary", "kanji", "grammar", "reading"];

function serializeGroup(group) {
    return {
        id: String(group._id || group.id || ""),
        title: group.title,
        level: group.level,
        order: group.order,
        status: group.status,
        createdAt: group.createdAt?.toISOString?.() || group.createdAt || "",
        updatedAt: group.updatedAt?.toISOString?.() || group.updatedAt || "",
    };
}

function serializeMiniTestSummary(test) {
    return {
        id: test.id,
        testTitle: test.testTitle,
        level: test.level,
        module: test.module,
        testKind: test.testKind,
        scopeType: test.scopeType,
        miniTestGroupId: test.miniTestGroupId,
        timeLimit: test.timeLimit,
        status: test.status,
        totalQuestions: test.totalQuestions,
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const level = String(searchParams.get("level") || "").trim().toUpperCase();

        if (!level) {
            return errorResponse(new Error("Missing level"));
        }

        await connectMongo();
        const [groups, miniResponse, config, ...categoryResponses] = await Promise.all([
            MiniTestGroup.find({ level, status: "published" }).sort({ order: 1, createdAt: 1 }).lean().exec(),
            getTests({ level, module: "mock_test", testKind: "module_exam", status: "published" }),
            MockTestConfig.findOne({ level }).lean().exec(),
            ...QUESTION_CATEGORIES.map((category) => getQuestions({ level, module: "mock_test", category, status: "published", limit: 1 })),
        ]);

        const miniTests = miniResponse?.items || [];
        const categoryCounts = Object.fromEntries(QUESTION_CATEGORIES.map((category, index) => [category, Number(categoryResponses[index]?.total || 0)]));

        return successResponse({
            level,
            availableQuestionCount: Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
            categoryCounts,
            distribution: {
                vocabulary: Number(config?.distribution?.vocabulary ?? DEFAULT_DISTRIBUTION.vocabulary),
                kanji: Number(config?.distribution?.kanji ?? DEFAULT_DISTRIBUTION.kanji),
                grammar: Number(config?.distribution?.grammar ?? DEFAULT_DISTRIBUTION.grammar),
                reading: Number(config?.distribution?.reading ?? DEFAULT_DISTRIBUTION.reading),
            },
            timeLimit: Number(config?.timeLimit || 30),
            fullTests: miniTests
                .filter((test) => !test.miniTestGroupId)
                .map(serializeMiniTestSummary),
            miniGroups: groups.map((group) => {
                const serializedGroup = serializeGroup(group);
                return {
                    ...serializedGroup,
                    tests: miniTests
                        .filter((test) => test.miniTestGroupId === serializedGroup.id)
                        .map(serializeMiniTestSummary),
                };
            }),
        });
    } catch (error) {
        return errorResponse(error);
    }
}
