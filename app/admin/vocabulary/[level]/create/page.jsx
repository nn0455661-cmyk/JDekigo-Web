import AdminLessonCreatePage from "@/components/admin/AdminLessonCreatePage";

export default async function VocabularyCreatePage(props) {
    const params = await props.params;
    return <AdminLessonCreatePage moduleKey="vocabulary" level={params?.level} />;
}
