import Question from "@/server/models/question.model";
import mongoose from "mongoose";

export async function findQuestions(query = {}, limit = 0, page = 1, opts = {}) {
    const q = { ...query };

    if (opts.random) {
        // Use aggregation sample to return random documents
        const sampleSize = Number(limit || 10);
        const pipeline = [{ $match: q }, { $sample: { size: sampleSize } }];
        const items = await Question.aggregate(pipeline);
        const total = await Question.countDocuments(q);
        return { items, total };
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(limit || 10));
    const items = await Question.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit || 10)).lean();
    const total = await Question.countDocuments(q);

    return { items, total };
}

export async function findQuestionById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Question.findById(id).lean();
}

export async function createQuestion(payload) {
    const next = new Question(payload);
    return next.save();
}

export async function updateQuestionById(id, payload) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Question.findByIdAndUpdate(id, payload, { new: true }).lean();
}

export async function deleteQuestionById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Question.findByIdAndDelete(id);
}
