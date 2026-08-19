import AdminLevelListPage from "@/components/admin/AdminLevelListPage";

export default async function ReadingLevelPage(props) {
    const params = await props.params;
    return <AdminLevelListPage moduleKey="reading" level={params?.level} />;
}
