import AdminUserStatisticsDetailPage from "@/components/admin/AdminUserStatisticsDetailPage";

export const dynamic = "force-dynamic";

export default async function UserStatisticsPage(props) {
    const params = await props.params;
    return <AdminUserStatisticsDetailPage userId={params.userId} />;
}
