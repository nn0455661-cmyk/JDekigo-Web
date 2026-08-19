import AdminMockQuestionBank from "@/components/admin/AdminMockQuestionBank";

export default async function AdminQuestionsPage(props) {
    const params = await props.params;
    const { level } = params;

    return <AdminMockQuestionBank level={level} />;
}
