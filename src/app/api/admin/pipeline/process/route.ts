import { NextRequest, NextResponse } from "next/server";
import { executeImportPipeline } from "@/lib/data-pipeline/csv-import-pipeline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvText } = body;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "csvText is required and must be a string." }, { status: 400 });
    }

    const pipelineResult = await executeImportPipeline(csvText);
    return NextResponse.json(pipelineResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Import pipeline processing failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
