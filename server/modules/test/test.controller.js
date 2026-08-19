import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { createAdminTest, deleteAdminTest, getTestById, getTests, updateAdminTest } from "./test.service";
import { createTestSchema, listTestsQuerySchema, updateTestSchema } from "./test.validation";

export async function listTests(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());
        const includeDrafts = query.includeDrafts === "true";
        delete query.includeDrafts;

        if (includeDrafts) {
            await requireAdmin(request);
        } else {
            query.status = "published";
        }

        const payload = listTestsQuerySchema.parse(query);
        const data = await getTests(payload);

        return successResponse(data);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function readTest(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await getTestById(id));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function createTestHandler(request) {
    try {
        await requireAdmin(request);
        const payload = createTestSchema.parse(await request.json());
        return successResponse(await createAdminTest(payload), 201);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateTestHandler(request, id) {
    try {
        await requireAdmin(request);
        const payload = updateTestSchema.parse(await request.json());
        return successResponse(await updateAdminTest(id, payload));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function deleteTestHandler(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await deleteAdminTest(id));
    } catch (error) {
        return errorResponse(error);
    }
}
