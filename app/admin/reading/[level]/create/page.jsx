import AdminLessonCreatePage from "@/components/admin/AdminLessonCreatePage";

export default async function ReadingCreatePage(props) {
    const params = await props.params;
    return <AdminLessonCreatePage moduleKey="reading" level={params?.level} />;
}
