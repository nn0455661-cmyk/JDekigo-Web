const LEGACY_LESSON_SIZE = 10;

function getId(value) {
    return String(value || "").trim();
}

function getOrder(value) {
    const order = Number(value);
    return Number.isFinite(order) && order > 0 ? order : 999999;
}

export function makeKanjiLessonKey(source = {}) {
    const lessonId = getId(source.lessonId || source.id);
    if (lessonId) {
        return lessonId;
    }

    const order = Number(source.lessonOrder);
    if (Number.isFinite(order) && order > 0) {
        return `order-${order}`;
    }

    return getId(source.key) || "common";
}

function makeFallbackLessonTitle(order) {
    return `Bai ${order} - Kanji`;
}

function sortKanjiItems(items = []) {
    return [...items].sort((a, b) => {
        const aOrder = getOrder(a.itemOrder || a.order);
        const bOrder = getOrder(b.itemOrder || b.order);
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        const aTime = new Date(a.createdAt || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || 0).getTime() || 0;
        if (aTime !== bTime) {
            return aTime - bTime;
        }

        return getId(a.id || a._id).localeCompare(getId(b.id || b._id));
    });
}

function buildLegacyKanjiLessons(levelItems = []) {
    const sorted = sortKanjiItems(levelItems);
    const lessons = [];

    for (let i = 0; i < sorted.length; i += LEGACY_LESSON_SIZE) {
        const lessonOrder = lessons.length + 1;
        lessons.push({
            key: `legacy-${lessonOrder}`,
            lessonId: "",
            lessonOrder,
            lessonTitle: makeFallbackLessonTitle(lessonOrder),
            items: sorted.slice(i, i + LEGACY_LESSON_SIZE),
        });
    }

    return lessons;
}

export function buildKanjiLessons(levelItems = [], lessonItems = []) {
    const lessonsByKey = new Map();

    lessonItems.forEach((lesson) => {
        const key = makeKanjiLessonKey(lesson);
        if (!key || lessonsByKey.has(key)) {
            return;
        }

        const lessonOrder = getOrder(lesson.lessonOrder);
        lessonsByKey.set(key, {
            key,
            lessonId: getId(lesson.lessonId || lesson.id),
            lessonOrder,
            lessonTitle: lesson.lessonTitle || makeFallbackLessonTitle(lessonOrder),
            status: lesson.status || "",
            items: [],
        });
    });

    levelItems.forEach((item) => {
        const key = makeKanjiLessonKey(item);
        const lessonOrder = getOrder(item.lessonOrder);

        if (!lessonsByKey.has(key)) {
            lessonsByKey.set(key, {
                key,
                lessonId: getId(item.lessonId),
                lessonOrder,
                lessonTitle: item.lessonTitle || makeFallbackLessonTitle(lessonOrder),
                status: "",
                items: [],
            });
        }

        lessonsByKey.get(key).items.push(item);
    });

    const lessons = Array.from(lessonsByKey.values())
        .map((lesson) => ({
            ...lesson,
            items: sortKanjiItems(lesson.items),
        }))
        .sort((a, b) => {
            if (a.lessonOrder !== b.lessonOrder) {
                return a.lessonOrder - b.lessonOrder;
            }

            return a.lessonTitle.localeCompare(b.lessonTitle);
        });

    if (lessons.length) {
        return lessons;
    }

    return buildLegacyKanjiLessons(levelItems);
}
