import { redirect } from "next/navigation";

export default async function ShadowingLevelPage(props) {
    const params = await props.params;
    const level = String(params?.level || "JPD113").toLowerCase();
    redirect(`/admin/video/${level}`);
}
