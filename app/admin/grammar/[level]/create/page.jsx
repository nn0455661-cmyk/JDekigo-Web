import AdminLessonCreatePage from "@/components/admin/AdminLessonCreatePage";

export default async function GrammarCreatePage(props) {
    const params = await props.params;
    return <AdminLessonCreatePage moduleKey="grammar" level={params?.level} />;
}
