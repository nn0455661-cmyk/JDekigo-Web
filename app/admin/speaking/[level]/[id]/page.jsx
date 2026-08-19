import SpeakingEditorPage from "@/components/admin/SpeakingEditorPage";

export default async function SpeakingDetailPage(props) {
    const params = await props.params;
    return <SpeakingEditorPage level={params?.level} contentId={params?.id} mode="edit" />;
}
