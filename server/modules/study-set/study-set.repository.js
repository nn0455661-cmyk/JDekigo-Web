import mongoose from "mongoose";
import StudySet from "@/server/models/study-set.model";

function isValidStudySetId(studySetId) {
    return mongoose.isValidObjectId(studySetId);
}

export async function findStudySetsByUserId(userId) {
    return StudySet.find({ userId }).sort({ createdAt: -1 }).lean().exec();
}

export async function findStudySetById(userId, studySetId) {
    if (!isValidStudySetId(studySetId)) {
        return null;
    }

    return StudySet.findOne({ _id: studySetId, userId }).lean().exec();
}

export async function createStudySet(userId, input) {
    return StudySet.create({
        userId,
        name: input.name,
        cards: input.cards || [],
    });
}

export async function updateStudySetById(userId, studySetId, input) {
    if (!isValidStudySetId(studySetId)) {
        return null;
    }

    return StudySet.findOneAndUpdate(
        { _id: studySetId, userId },
        {
            $set: {
                ...(input.name ? { name: input.name } : {}),
                ...(Array.isArray(input.cards) ? { cards: input.cards } : {}),
            },
        },
        { new: true, runValidators: true }
    ).lean().exec();
}

export async function deleteStudySetById(userId, studySetId) {
    if (!isValidStudySetId(studySetId)) {
        return null;
    }

    // First find the document to validate existence and ownership
    const doc = await StudySet.findById(studySetId).exec();

    if (!doc) {
        return null;
    }

    // Ensure the owner matches (compare stringified ids)
    if (String(doc.userId) !== String(userId)) {
        return null;
    }

    // Delete and return the original document for caller to inspect
    await StudySet.deleteOne({ _id: studySetId }).exec();

    // convert to plain object similar to previous behavior
    return doc.toObject ? doc.toObject() : doc;
}