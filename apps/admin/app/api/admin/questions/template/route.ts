import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware";
import * as XLSX from "xlsx";

const HEADERS = [
  "grade_id",
  "subject_id",
  "knowledge_point_ids",
  "type",
  "content",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f",
  "correct_keys",
  "analysis",
  "difficulty",
  "score",
  "sort_order",
];

const SAMPLE_ROWS: (string | number)[][] = [
  [
    1,
    1,
    "1|2",
    1,
    'Which word means "very happy"?',
    "Elated",
    "Devastated",
    "Anxious",
    "Confused",
    "",
    "",
    "A",
    "Elated means very happy or proud.",
    1,
    1,
    0,
  ],
  [
    1,
    1,
    "",
    2,
    "Which are programming languages?",
    "JavaScript",
    "HTML",
    "Python",
    "CSS",
    "",
    "",
    "A,C",
    "JavaScript and Python are programming languages.",
    2,
    1,
    1,
  ],
  [
    1,
    1,
    "",
    3,
    "The Earth is round.",
    "True",
    "False",
    "",
    "",
    "",
    "",
    "A",
    "The Earth is approximately spherical.",
    1,
    1,
    2,
  ],
];

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  ws["!cols"] = HEADERS.map((h) => ({
    wch: h === "content" || h.startsWith("option_") ? 24 : 14,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="questions_template.xlsx"',
    },
  });
}
