import AdminLevelListPage from "@/components/admin/AdminLevelListPage";

export default async function GrammarLevelPage(props) {
    const params = await props.params;
    return <AdminLevelListPage moduleKey="grammar" level={params?.level} />;
}
