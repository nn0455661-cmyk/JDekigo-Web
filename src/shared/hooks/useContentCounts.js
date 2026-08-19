"use client";

import { useEffect, useState } from "react";
import { getCachedContentStats, getContentStats } from "@/src/services/content-counts.service";

const EMPTY_STATS = {
    counts: { JPD113: null, JPD123: null },
    itemCounts: { JPD113: null, JPD123: null },
};

export function useContentCounts(moduleKey) {
    return useContentStats(moduleKey).counts;
}

export function useContentStats(moduleKey) {
    const [stats, setStats] = useState(EMPTY_STATS);

    useEffect(() => {
        let mounted = true;

        const cached = getCachedContentStats(moduleKey);
        if (cached && mounted) {
            setStats(cached);
        }

        getContentStats(moduleKey)
            .then((nextStats) => {
                if (mounted) setStats(nextStats || EMPTY_STATS);
            })
            .catch(() => {
                if (mounted) setStats({
                    counts: { JPD113: 0, JPD123: 0 },
                    itemCounts: { JPD113: 0, JPD123: 0 },
                });
            });

        return () => {
            mounted = false;
        };
    }, [moduleKey]);

    return stats;
}
