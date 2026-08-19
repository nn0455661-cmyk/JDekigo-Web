import { redirect } from "next/navigation";

export default async function AdminFullTestsPage(props) {
    const params = await props.params;
    const normalizedLevel = String(params?.level || "jpd113").toLowerCase();
    redirect(`/admin/tests/${normalizedLevel}`);
}
