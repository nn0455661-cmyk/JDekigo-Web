import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { connectMongo } from "@/server/lib/mongoose";
import AudioAsset from "@/server/models/audioAsset.model";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, props) {
    const params = await props.params;
    try {
        await connectMongo();
        const asset = await AudioAsset.findById(params?.id).lean().exec();

        if (!asset) {
            throw new AppError("Audio not found", 404, "AUDIO_NOT_FOUND");
        }

        const audioBuffer = Buffer.isBuffer(asset.data) ? asset.data : Buffer.from(asset.data?.buffer || asset.data || []);

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": asset.mimeType || "audio/mpeg",
                "Content-Length": String(asset.size || audioBuffer.length || 0),
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        await connectMongo();
        const asset = await AudioAsset.findByIdAndDelete(params?.id).lean().exec();

        if (!asset) {
            throw new AppError("Audio not found", 404, "AUDIO_NOT_FOUND");
        }

        return successResponse({ deleted: true, id: String(asset._id) });
    } catch (error) {
        return errorResponse(error);
    }
}
