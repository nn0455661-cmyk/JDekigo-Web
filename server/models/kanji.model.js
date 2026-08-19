import mongoose from "mongoose";

const kanjiSchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
        kanji: { type: String, required: true },
        reading: { type: String },
        hanviet: { type: String },
        onyomi: { type: String },
        kunyomi: { type: String },
        meaning: { type: String, required: true },
        example: { type: String },
        illustrationImage: { type: String },
        drawingImage: { type: String }, // URL to image/gif
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const cachedKanjiModel = mongoose.models.Kanji;

if (cachedKanjiModel) {
    const schemaPaths = cachedKanjiModel.schema?.paths || {};
    const hasReadingField = Object.prototype.hasOwnProperty.call(schemaPaths, "reading");
    const hasHanvietField = Object.prototype.hasOwnProperty.call(schemaPaths, "hanviet");
    const hasIllustrationImageField = Object.prototype.hasOwnProperty.call(schemaPaths, "illustrationImage");

    if (!hasReadingField || !hasHanvietField || !hasIllustrationImageField) {
        delete mongoose.models.Kanji;
    }
}

const Kanji = mongoose.models.Kanji || mongoose.model("Kanji", kanjiSchema);
export default Kanji;