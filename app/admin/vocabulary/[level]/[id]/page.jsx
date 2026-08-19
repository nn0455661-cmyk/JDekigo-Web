import AdminLessonDetailPage from "@/components/admin/AdminLessonDetailPage";

export default async function VocabularyLessonDetailPage(props) {
    const params = await props.params;
    return <AdminLessonDetailPage moduleKey="vocabulary" level={params?.level} lessonId={params?.id} />;
}
