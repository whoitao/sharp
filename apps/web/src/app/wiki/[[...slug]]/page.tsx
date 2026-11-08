import { Loader2 } from "lucide-react";
import { WikiBrowser } from "@/components/wiki/wiki-browser";
import {
  fetchWikiPage,
  fetchWikiTree,
  type WikiPageDetail,
  type WikiTreeNode,
} from "@/lib/wiki/api";
import { notFound } from "next/navigation";
import { Suspense } from "react";

/** /wiki 默认打开第一个叶子节点，避免首页只有空面板 */
function firstLeaf(nodes: WikiTreeNode[]): WikiTreeNode | null {
  for (const node of nodes) {
    if (node.children.length === 0) return node;
    const leaf = firstLeaf(node.children);
    if (leaf) return leaf;
  }
  return null;
}

async function WikiContent({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const tree = await fetchWikiTree();
  const requestedPath = slug && slug.length > 0 ? slug.join("/") : null;

  let detail: WikiPageDetail | null = null;
  if (requestedPath) {
    detail = await fetchWikiPage(requestedPath);
    if (!detail) notFound();
  } else {
    const first = firstLeaf(tree);
    if (first) detail = await fetchWikiPage(first.path);
  }

  return <WikiBrowser tree={tree} detail={detail} />;
}

export default function WikiPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  // cacheComponents 下 params 与远程数据读取需要 Suspense 边界
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <WikiContent params={params} />
    </Suspense>
  );
}
