import AdminLevelListPage from "@/components/admin/AdminLevelListPage";

export default async function VocabularyLevelPage(props) {
    const params = await props.params;
    return <AdminLevelListPage moduleKey="vocabulary" level={params?.level} />;
}
