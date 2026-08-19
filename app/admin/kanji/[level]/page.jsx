import AdminLevelListPage from "@/components/admin/AdminLevelListPage";

export default async function KanjiLevelPage(props) {
    const params = await props.params;
    return <AdminLevelListPage moduleKey="kanji" level={params?.level} />;
}
