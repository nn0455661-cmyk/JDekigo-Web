import { readQuestion, updateQuestionHandler, deleteQuestionHandler } from "@/server/modules/question/question.controller";

export async function GET(request, props) {
    const params = await props.params;
    return readQuestion(request, params.id);
}

export async function PATCH(request, props) {
    const params = await props.params;
    return updateQuestionHandler(request, params.id);
}

export async function DELETE(request, props) {
    const params = await props.params;
    return deleteQuestionHandler(request, params.id);
}
