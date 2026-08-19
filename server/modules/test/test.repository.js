import Test from "@/server/models/test.model";

export async function findTests(query, limit) {
    const q = Test.find(query).sort({ createdAt: -1 });

    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
        q.limit(limit);
    }

    return q.lean().exec();
}

export async function findTestById(id, status) {
    const query = {
        _id: id,
        ...(status ? { status } : {}),
    };

    return Test.findOne(query).lean().exec();
}

export async function createTest(input) {
    return Test.create(input);
}

export async function updateTestById(id, input) {
    return Test.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean().exec();
}

export async function deleteTestById(id) {
    return Test.findByIdAndDelete(id).lean().exec();
}
