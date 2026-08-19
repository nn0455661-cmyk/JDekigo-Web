import Lesson from "@/server/models/lesson.model";

export async function findLessons(query) {
    return Lesson.find(query).sort({ lessonOrder: 1, createdAt: -1 }).lean().exec();
}

export async function findLessonById(id) {
    return Lesson.findById(id).lean().exec();
}

export async function createLesson(input) {
    return Lesson.create(input);
}

export async function updateLessonById(id, input) {
    return Lesson.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean().exec();
}

export async function deleteLessonById(id) {
    return Lesson.findByIdAndDelete(id).lean().exec();
}