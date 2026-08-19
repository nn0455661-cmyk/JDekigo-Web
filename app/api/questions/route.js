import { listQuestions, createQuestionHandler } from "@/server/modules/question/question.controller";
import { readQuestion, updateQuestionHandler, deleteQuestionHandler } from "@/server/modules/question/question.controller";

export async function GET(request) {
    return listQuestions(request);
}

export async function POST(request) {
    return createQuestionHandler(request);
}

export async function PUT(request) {
    // Not used; individual question updates use /api/questions/:id
    return new Response(null, { status: 405 });
}

export async function DELETE(request) {
    return new Response(null, { status: 405 });
}
