import ShadowingVideoEditorPage from "@/components/admin/ShadowingVideoEditorPage";

export default async function VideoCreatePage(props) {
    const params = await props.params;
    return <ShadowingVideoEditorPage moduleKey="video" level={params?.level} basePath="video" />;
}
