"use client";

import { useEffect, useRef, useState } from "react";
import studysetService from "src/services/studyset.service";

const AUTO_SET_PREFIX = "auto_vocab";

function normalizeCards(cards) {
    if (!Array.isArray(cards)) {
        return [];
    }

    return cards.map((card, index) => ({
        ...card,
        id: String(card?.id || `${Date.now()}-${index}`),
    }));
}

function normalizeSet(set, index) {
    return {
        ...set,
        _id: String(set?._id || set?.id || `${Date.now()}-${index}`),
        name: String(set?.name || "Untitled").trim(),
        cards: normalizeCards(set?.cards),
        createdAt: set?.createdAt || new Date().toISOString(),
    };
}

function normalizeUserStudySets(storedSets) {
    const normalizedStored = Array.isArray(storedSets)
        ? storedSets.map((set, index) => normalizeSet(set, index))
        : [];

    return normalizedStored.filter((set) => !String(set._id).startsWith(AUTO_SET_PREFIX));
}

function getCachedNormalizedStudySets() {
    const payload = studysetService.getCachedStudySets();
    const items = payload?.items || payload?.studySets || payload || [];
    return normalizeUserStudySets(items);
}

export function useStudySets({ revalidateOnMount = true } = {}) {
    const [studySets, setStudySets] = useState(() => getCachedNormalizedStudySets());
    const [isReady, setIsReady] = useState(() => studysetService.getCachedStudySets() !== null);
    const studySetsRef = useRef([]);
    const hasInitialCacheRef = useRef(studysetService.getCachedStudySets() !== null);
    const loadVersionRef = useRef(0);

    useEffect(() => {
        studySetsRef.current = studySets;
    }, [studySets]);

    const refreshStudySets = async ({ force = false, fallbackSets = [] } = {}) => {
        const loadVersion = ++loadVersionRef.current;

        try {
            const payload = await studysetService.getStudySets({ force });
            const nextSets = normalizeUserStudySets(payload?.items || payload?.studySets || payload || []);

            if (loadVersion === loadVersionRef.current) {
                setStudySets(nextSets);
            }

            return nextSets;
        } catch (error) {
            if (loadVersion === loadVersionRef.current) {
                setStudySets(fallbackSets);
            }

            throw error;
        } finally {
            if (loadVersion === loadVersionRef.current) {
                setIsReady(true);
            }
        }
    };

    const refreshAfterWrite = async (fallbackSets) => {
        try {
            await refreshStudySets({ force: true, fallbackSets });
        } catch {
            // The write already succeeded. Keep the saved response if the follow-up refresh fails.
        }
    };

    useEffect(() => {
        if (!revalidateOnMount && hasInitialCacheRef.current) {
            return () => {
                loadVersionRef.current += 1;
            };
        }

        void refreshStudySets().catch(() => {
            // Loading failure is reflected by the empty fallback state.
        });

        return () => {
            loadVersionRef.current += 1;
        };
    }, [revalidateOnMount]);

    const createSet = async (name) => {
        const payload = { name: name.trim(), cards: [] };
        const response = await studysetService.createStudySet(payload);
        const created = normalizeSet(response?.item || response, 0);

        setStudySets((current) => [created, ...current]);
        await refreshAfterWrite([created, ...studySetsRef.current]);
        return created;
    };

    const deleteSet = async (id) => {
        await studysetService.deleteStudySet(id);
        const fallbackSets = studySetsRef.current.filter((item) => item._id !== id);
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
    };

    const renameSet = async (id, nextName) => {
        const normalized = nextName.trim();
        if (!normalized) {
            return;
        }

        const currentSet = studySetsRef.current.find((item) => item._id === id);
        if (!currentSet) {
            return;
        }

        const response = await studysetService.updateStudySet(id, {
            name: normalized,
            cards: currentSet.cards,
        });

        const saved = normalizeSet(response?.item || response, 0);
        const fallbackSets = studySetsRef.current.map((set) => (set._id === id ? saved : set));
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
    };

    const addCardToSet = async (setId, card) => {
        const currentSet = studySetsRef.current.find((item) => item._id === setId);
        if (!currentSet) {
            return;
        }

        const nextSet = {
            ...currentSet,
            cards: [...currentSet.cards, { ...card, id: String(Date.now()) }],
        };

        const response = await studysetService.updateStudySet(setId, {
            name: nextSet.name,
            cards: nextSet.cards,
        });

        const saved = normalizeSet(response?.item || response, 0);
        const fallbackSets = studySetsRef.current.map((set) => (set._id === setId ? saved : set));
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
    };

    const addCardsToSet = async (setId, cards) => {
        const normalizedSetId = String(setId || "");
        const stampedCards = cards.map((card, index) => ({
            ...card,
            id: `${Date.now()}-${index}`,
        }));

        const currentSet = studySetsRef.current.find((item) =>
            [item._id, item.id, item.name]
                .filter(Boolean)
                .some((value) => String(value) === normalizedSetId)
        );
        if (!currentSet) {
            throw new Error("Không tìm thấy học phần đã chọn.");
        }

        const effectiveSetId = String(currentSet._id || currentSet.id || normalizedSetId);

        const response = await studysetService.updateStudySet(effectiveSetId, {
            name: currentSet.name,
            cards: [...currentSet.cards, ...stampedCards],
        });

        const saved = normalizeSet(response?.item || response, 0);
        const fallbackSets = studySetsRef.current.map((set) => (String(set._id || set.id) === effectiveSetId ? saved : set));
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
        return saved;
    };

    const updateCardInSet = async (setId, cardId, nextCard) => {
        const currentSet = studySetsRef.current.find((item) => item._id === setId);
        if (!currentSet) {
            return;
        }

        const nextCards = currentSet.cards.map((card) =>
            card.id === cardId
                ? {
                    ...card,
                    ...nextCard,
                }
                : card
        );

        const response = await studysetService.updateStudySet(setId, {
            name: currentSet.name,
            cards: nextCards,
        });

        const saved = normalizeSet(response?.item || response, 0);
        const fallbackSets = studySetsRef.current.map((set) => (set._id === setId ? saved : set));
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
    };

    const deleteCardFromSet = async (setId, cardId) => {
        const currentSet = studySetsRef.current.find((item) => item._id === setId);
        if (!currentSet) {
            return;
        }

        const response = await studysetService.updateStudySet(setId, {
            name: currentSet.name,
            cards: currentSet.cards.filter((card) => card.id !== cardId),
        });

        const saved = normalizeSet(response?.item || response, 0);
        const fallbackSets = studySetsRef.current.map((set) => (set._id === setId ? saved : set));
        setStudySets(fallbackSets);
        await refreshAfterWrite(fallbackSets);
    };

    const getSetById = (setId) => {
        const normalizedSetId = String(setId || "");
        return studySets.find((item) =>
            [item._id, item.id]
                .filter(Boolean)
                .some((value) => String(value) === normalizedSetId)
        );
    };

    return {
        studySets,
        isReady,
        createSet,
        deleteSet,
        renameSet,
        addCardToSet,
        addCardsToSet,
        updateCardInSet,
        deleteCardFromSet,
        getSetById,
    };
}
