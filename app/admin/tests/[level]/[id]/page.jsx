import AdminTestCreatePage from "@/components/admin/AdminTestCreatePage";

export default async function EditTestPage(props) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    return <AdminTestCreatePage level={params?.level} testId={params?.id} searchParams={searchParams} />;
}
