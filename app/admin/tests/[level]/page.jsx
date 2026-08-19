import AdminTestTabsPage from "@/components/admin/AdminTestTabsPage";

export default async function TestsLevelPage(props) {
    const params = await props.params;
    return <AdminTestTabsPage level={params?.level} />;
}
