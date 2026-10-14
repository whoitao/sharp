import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { name, sortOrder, icon } = body;

  const data: Record<string, any> = {};
  if (name !== undefined) data.name = name;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (icon !== undefined) data.icon = icon || null;

  const category = await prisma.category.update({
    where: { id: BigInt(id) },
    data,
  });

  return NextResponse.json({
    ...category,
    id: category.id.toString(),
    parentId: category.parentId ? category.parentId.toString() : "0",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const categoryId = BigInt(id);

  // Get all subcategory IDs (including the target category)
  const categoryIds = await getAllSubcategoryIds(categoryId);

  // Delete in order: options -> questions -> progress/records -> categories
  await prisma.questionOption.deleteMany({
    where: {
      question: {
        categoryId: { in: categoryIds },
      },
    },
  });

  await prisma.userQuestionProgress.deleteMany({
    where: { categoryId: { in: categoryIds } },
  });

  await prisma.userStudyRecord.deleteMany({
    where: { categoryId: { in: categoryIds } },
  });

  await prisma.question.deleteMany({
    where: { categoryId: { in: categoryIds } },
  });

  // Delete categories (children first to avoid foreign key issues)
  // Sort by depth: delete deepest children first
  const sortedIds = await getSortedCategoryIds(categoryIds);
  for (const catId of sortedIds) {
    await prisma.category.delete({
      where: { id: catId },
    }).catch(() => {
      // Ignore if already deleted
    });
  }

  return NextResponse.json({ success: true });
}

async function getAllSubcategoryIds(parentId: bigint): Promise<bigint[]> {
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });

  let ids: bigint[] = [parentId];
  for (const child of children) {
    const childIds = await getAllSubcategoryIds(child.id);
    ids = ids.concat(childIds);
  }
  return ids;
}

// Get category IDs sorted by depth (deepest first) for safe deletion
async function getSortedCategoryIds(ids: bigint[]): Promise<bigint[]> {
  const categories = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { id: true, parentId: true },
  });

  // Build a map for quick lookup
  const catMap = new Map<bigint, { id: bigint; parentId: bigint | null }>();
  categories.forEach(c => catMap.set(c.id, c));

  // Calculate depth for each category
  const depthMap = new Map<bigint, number>();
  const getDepth = (id: bigint, visited = new Set<bigint>()): number => {
    if (depthMap.has(id)) return depthMap.get(id)!;
    if (visited.has(id)) return 0; // Cycle detection
    visited.add(id);

    const cat = catMap.get(id);
    if (!cat || !cat.parentId) {
      depthMap.set(id, 0);
      return 0;
    }

    const parentDepth = ids.includes(cat.parentId) ? getDepth(cat.parentId, visited) : 0;
    const depth = parentDepth + 1;
    depthMap.set(id, depth);
    return depth;
  };

  ids.forEach(id => getDepth(id));

  // Sort by depth descending (deepest first)
  return [...ids].sort((a, b) => (depthMap.get(b) || 0) - (depthMap.get(a) || 0));
}
