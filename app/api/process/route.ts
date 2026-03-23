import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const files = formData.getAll("files") as File[];
    const format = ((formData.get("format") as string) || "webp").toLowerCase();
    const width = Number(formData.get("width")) || 1600;
    const quality = Number(formData.get("quality")) || 80;

    if (!files.length) {
      return NextResponse.json(
        { error: "No files were uploaded." },
        { status: 400 }
      );
    }

    const processedFiles: { name: string; data: string; mimeType: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const inputBuffer = Buffer.from(await file.arrayBuffer());

      let transformer = sharp(inputBuffer).rotate();

      if (width > 0) {
        transformer = transformer.resize({
          width,
          withoutEnlargement: true,
        });
      }

      let outputBuffer: Buffer;
      let outputExtension: string;
      let mimeType: string;

      if (format === "jpg") {
        outputBuffer = await transformer.jpeg({ quality }).toBuffer();
        outputExtension = "jpg";
        mimeType = "image/jpeg";
      } else if (format === "png") {
        outputBuffer = await transformer.png().toBuffer();
        outputExtension = "png";
        mimeType = "image/png";
      } else {
        outputBuffer = await transformer.webp({ quality }).toBuffer();
        outputExtension = "webp";
        mimeType = "image/webp";
      }

      const baseName = file.name.replace(/\.[^/.]+$/, "");

      processedFiles.push({
        name: `${baseName}.${outputExtension}`,
        data: outputBuffer.toString("base64"),
        mimeType,
      });
    }

    return NextResponse.json({ files: processedFiles });
  } catch (error) {
    console.error("PROCESS ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown processing error",
      },
      { status: 500 }
    );
  }
}