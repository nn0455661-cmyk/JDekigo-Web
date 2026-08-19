import ShadowingVideoManagerPage from "@/components/admin/ShadowingVideoManagerPage";

export default async function VideoLevelPage(props) {
    const params = await props.params;
    return <ShadowingVideoManagerPage moduleKey="video" level={params?.level} basePath="video" />;
}
