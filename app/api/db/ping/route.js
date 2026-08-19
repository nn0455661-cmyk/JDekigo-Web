import { NextResponse } from "next/server";
import { connectMongo } from "@/server/lib/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const connection = await connectMongo();

        return NextResponse.json(
            {
                ok: true,
                readyState: connection.connection.readyState,
            },
            { status: 200 }
        );
    } catch {
        return NextResponse.json(
            {
                ok: false,
                message: "MongoDB connection failed.",
            },
            { status: 500 }
        );
    }
}
