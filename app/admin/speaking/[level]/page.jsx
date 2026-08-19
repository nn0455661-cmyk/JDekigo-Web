import SpeakingManagerPage from "@/components/admin/SpeakingManagerPage";

export default async function SpeakingLevelPage(props) {
    const params = await props.params;
    return <SpeakingManagerPage level={params?.level} />;
}
