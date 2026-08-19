import SpeakingEditorPage from "@/components/admin/SpeakingEditorPage";

export default async function SpeakingCreatePage(props) {
    const params = await props.params;
    return <SpeakingEditorPage level={params?.level} mode="create" />;
}
