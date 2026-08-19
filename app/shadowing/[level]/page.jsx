import { redirect } from "next/navigation";

export default async function ShadowingLevelPage(props) {
    const params = await props.params;
    const level = String(params?.level || "JPD113").toUpperCase();
    redirect(`/video/${level}`);
}
