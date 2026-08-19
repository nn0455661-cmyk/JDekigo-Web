import AdminLessonDetailPage from "@/components/admin/AdminLessonDetailPage";

export default async function KanjiLessonDetailPage(props) {
    const params = await props.params;
    return <AdminLessonDetailPage moduleKey="kanji" level={params?.level} lessonId={params?.id} />;
}
