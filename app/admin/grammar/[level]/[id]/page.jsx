import AdminLessonDetailPage from "@/components/admin/AdminLessonDetailPage";

export default async function GrammarLessonDetailPage(props) {
    const params = await props.params;
    return <AdminLessonDetailPage moduleKey="grammar" level={params?.level} lessonId={params?.id} />;
}
