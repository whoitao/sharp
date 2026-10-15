import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";
import { parse } from "csv-parse/sync";

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { categoryId, csv } = body;

  if (!categoryId || !csv) {
    return NextResponse.json(
      { error: "categoryId and csv are required" },
      { status: 400 }
    );
  }

  try {
    const records = parse(csv, {
      columns: [
        "type",
        "content",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_keys",
        "analysis",
        "difficulty",
        "score",
        "sort_order",
      ],
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const type = parseInt(row.type);
        if (![1, 2, 3, 4].includes(type)) {
          errors.push(`Row ${i + 1}: Invalid type "${row.type}"`);
          continue;
        }

        const correctKeys = row.correct_keys
          .split(",")
          .map((k: string) => k.trim().toUpperCase());

        const optionEntries = [
          { key: "A", content: row.option_a },
          { key: "B", content: row.option_b },
          { key: "C", content: row.option_c },
          { key: "D", content: row.option_d },
        ].filter((o: any) => o.content && o.content.trim() !== "");

        if (optionEntries.length === 0) {
          errors.push(`Row ${i + 1}: No options provided`);
          continue;
        }

        await prisma.question.create({
          data: {
            categoryId: BigInt(categoryId),
            type,
            content: row.content,
            analysis: row.analysis || null,
            difficulty: parseInt(row.difficulty) || 1,
            score: parseInt(row.score) || 1,
            sortOrder: parseInt(row.sort_order) || 0,
            options: {
              create: optionEntries.map((o, idx) => ({
                optionKey: o.key,
                content: o.content,
                isCorrect: correctKeys.includes(o.key),
                sortNo: idx,
              })),
            },
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({
      imported,
      total: records.length,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `CSV parse error: ${err.message}` },
      { status: 400 }
    );
  }
}
