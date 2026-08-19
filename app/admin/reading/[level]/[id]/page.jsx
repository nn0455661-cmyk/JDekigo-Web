import AdminLessonDetailPage from "@/components/admin/AdminLessonDetailPage";

export default async function ReadingLessonDetailPage(props) {
    const params = await props.params;
    return <AdminLessonDetailPage moduleKey="reading" level={params?.level} lessonId={params?.id} />;
}
