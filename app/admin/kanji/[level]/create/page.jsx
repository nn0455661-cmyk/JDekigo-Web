import AdminLessonCreatePage from "@/components/admin/AdminLessonCreatePage";

export default async function KanjiCreatePage(props) {
    const params = await props.params;
    return <AdminLessonCreatePage moduleKey="kanji" level={params?.level} />;
}
