import ShadowingVideoEditorPage from "@/components/admin/ShadowingVideoEditorPage";

export default async function VideoDetailPage(props) {
    const params = await props.params;
    return (
        <ShadowingVideoEditorPage
            moduleKey="video"
            level={params?.level}
            contentId={params?.id}
            mode="edit"
            basePath="video"
        />
    );
}
