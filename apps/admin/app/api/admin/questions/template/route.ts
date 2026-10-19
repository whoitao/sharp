import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware";

const TEMPLATE_CSV = [
  "category_id,type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order",
  '1,1,Which word means "very happy"?,Elated,Devastated,Anxious,Confused,A,"Elated means very happy or proud.",1,1,0',
  '1,2,Which are programming languages?,JavaScript,HTML,Python,CSS,"A,C","JavaScript and Python are programming languages.",2,1,1',
  '1,3,The Earth is round.,True,False,,,,A,"The Earth is approximately spherical.",1,1,2',
].join("\n");

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  return new NextResponse(TEMPLATE_CSV, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="questions_template.csv"',
    },
  });
}
