import AdminTestCreatePage from "@/components/admin/AdminTestCreatePage";

export default async function CreateTestPage(props) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    return <AdminTestCreatePage level={params?.level} searchParams={searchParams} />;
}
