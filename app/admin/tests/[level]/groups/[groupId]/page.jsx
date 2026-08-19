import AdminMiniTestGroupDetailPage from "@/components/admin/AdminMiniTestGroupDetailPage";

export default async function MiniTestGroupPage(props) {
    const params = await props.params;
    return <AdminMiniTestGroupDetailPage level={params?.level} groupId={params?.groupId} />;
}
