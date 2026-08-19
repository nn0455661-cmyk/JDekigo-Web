import { useEffect, useState } from "react";
import { getImages } from "src/services/assets.service";

const DEFAULT_HERO_IMAGE = "/h1.jpg";

export function useHeroImages() {
    const [heroImageOptions, setHeroImageOptions] = useState([DEFAULT_HERO_IMAGE]);
    const [isHeroImagesLoaded, setIsHeroImagesLoaded] = useState(false);

    useEffect(() => {
        let isActive = true;

        const loadHeroImages = async () => {
            try {
                const result = await getImages();
                const nextOptions = Array.isArray(result?.data?.images) && result.data.images.length > 0 ? result.data.images : [DEFAULT_HERO_IMAGE];

                if (!isActive) return;

                setHeroImageOptions(nextOptions);
                setIsHeroImagesLoaded(true);
            } catch (err) {
                if (isActive) {
                    setHeroImageOptions([DEFAULT_HERO_IMAGE]);
                    setIsHeroImagesLoaded(true);
                }
            }
        };

        void loadHeroImages();

        return () => {
            isActive = false;
        };
    }, []);

    return { heroImageOptions, defaultHeroImage: DEFAULT_HERO_IMAGE, isHeroImagesLoaded };
}