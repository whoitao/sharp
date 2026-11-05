import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadTextbookCover,
} from "@/lib/storage";
import { normalizeTextbookCover } from "@/lib/textbook-cover";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const BING_IMAGES_ENDPOINT = "https://cn.bing.com/images/async";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
/** 单张候选图下载上限 15MB */
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;
/** 最多检查的候选数量，避免一次抓取耗时过长 */
const MAX_CANDIDATES = 12;
/** 整次抓取的总时间预算：超时后降级为「请手动上传」 */
const OVERALL_BUDGET_MS = 20_000;
/** 单批并发下载数（限制峰值内存：4 × 15MB） */
const DOWNLOAD_CONCURRENCY = 4;

/** 搜索词里使用通用叫法，命中率更高 */
const SUBJECT_QUERY_NAMES: Record<string, string> = { 道法: "道德与法治" };
const GRADE_QUERY_NAMES: Record<string, string> = {
  初一: "七年级",
  初二: "八年级",
  初三: "九年级",
};

function semesterLabel(semester: number): string {
  if (semester === 0) return "全一册";
  return semester === 2 ? "下册" : "上册";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** 用必应图片搜索（无需 API Key）按「教材名 + 封面」搜图 */
async function searchImageUrls(query: string, deadline: number): Promise<string[]> {
  const url = new URL(BING_IMAGES_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("first", "0");
  url.searchParams.set("count", "35");
  url.searchParams.set("scenario", "ImageBasicHover");
  url.searchParams.set("datsrc", "I");
  url.searchParams.set("layout", "RowBased_Landscape");
  url.searchParams.set("mmasync", "1");

  const timeout = Math.min(12_000, Math.max(1_000, deadline - Date.now()));
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://cn.bing.com/" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`image search failed: ${response.status}`);

  const html = await response.text();
  const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)];
  const urls = matches
    .map((m) => decodeEntities(m[1]))
    .filter((u) => /^https?:\/\//i.test(u));

  // 优先选 URL 里带 cover / book-cover 的图片（教材封面站点的命名习惯），
  // 避免把正文内页当成封面；同分内保持搜索结果原顺序。
  const score = (u: string) => {
    if (/book-cover/i.test(u)) return 2;
    if (/cover/i.test(u)) return 1;
    return 0;
  };
  return urls.sort((a, b) => score(b) - score(a));
}

/** 下载候选图，限制体积与超时（超时取单图上限与整体剩余预算的较小值） */
async function downloadImage(url: string, deadline: number): Promise<Uint8Array | null> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return null;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://cn.bing.com/" },
      redirect: "follow",
      signal: AbortSignal.timeout(Math.min(10_000, remaining)),
    });
    if (!response.ok) return null;

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_DOWNLOAD_BYTES) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_DOWNLOAD_BYTES) return null;
    return bytes;
  } catch {
    return null;
  }
}

/** 竖版、尺寸足够、文件头合法的图片才认为是教材封面 */
async function isCoverCandidate(bytes: Uint8Array): Promise<boolean> {
  if (!detectImageType(bytes)) return false;
  try {
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) return false;
    const ratio = height / width;
    return width >= 240 && height >= 320 && ratio >= 1.12 && ratio <= 1.6;
  } catch {
    return false;
  }
}

type RequestBody = {
  textbookId?: string | number;
  subjectName?: string;
  publisherName?: string;
  gradeName?: string;
  semester?: number;
  offset?: number;
};

async function buildQuery(body: RequestBody): Promise<string | null> {
  if (body.textbookId !== undefined && body.textbookId !== null && String(body.textbookId) !== "") {
    const textbook = await prisma.textbook.findUnique({
      where: { id: BigInt(String(body.textbookId)) },
      include: { subject: true, grade: true, publisher: true },
    });
    if (!textbook) return null;
    const subject = SUBJECT_QUERY_NAMES[textbook.subject.name] ?? textbook.subject.name;
    const grade = GRADE_QUERY_NAMES[textbook.grade.name] ?? textbook.grade.name;
    return `${subject} ${textbook.publisher.name} ${grade}${semesterLabel(textbook.semester)} 教材 封面`;
  }

  if (!body.subjectName || !body.publisherName || !body.gradeName) return null;
  const subject = SUBJECT_QUERY_NAMES[body.subjectName] ?? body.subjectName;
  const grade = GRADE_QUERY_NAMES[body.gradeName] ?? body.gradeName;
  return `${subject} ${body.publisherName} ${grade}${semesterLabel(Number(body.semester ?? 1))} 教材 封面`;
}

/**
 * 从网络抓取教材封面并上传到存储。
 * body: { textbookId? } 或 { subjectName, publisherName, gradeName, semester }
 * 可选 offset：跳过前 N 张合格候选，便于「换一张」。
 * 仅返回存储路径，是否保存到教材由调用方提交表单时决定。
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const query = await buildQuery(body);
  if (!query) {
    return NextResponse.json(
      { error: "缺少教材信息：请先选择学段、年级、学期、科目和版本" },
      { status: 400 },
    );
  }

  const offset = Math.max(0, Number(body.offset ?? 0) || 0);
  const deadline = Date.now() + OVERALL_BUDGET_MS;

  let urls: string[];
  try {
    urls = await searchImageUrls(query, deadline);
  } catch (err) {
    console.error("[textbook-cover] search failed", err);
    return NextResponse.json({ error: "封面搜索失败，请稍后重试" }, { status: 502 });
  }

  // 分批并发下载（每批 4 张），按原排序收集合格候选，找到第 offset+1 张即停止。
  // 整体预算耗尽后降级为「请手动上传」，不会让请求一直挂到网关超时。
  const candidates = urls.slice(0, MAX_CANDIDATES);
  const valid: Array<{ bytes: Uint8Array; url: string }> = [];

  for (let i = 0; i < candidates.length; i += DOWNLOAD_CONCURRENCY) {
    if (Date.now() >= deadline) break;
    const chunk = candidates.slice(i, i + DOWNLOAD_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (url) => {
        const bytes = await downloadImage(url, deadline);
        if (!bytes) return null;
        if (!(await isCoverCandidate(bytes))) return null;
        return { bytes, url };
      }),
    );
    for (const result of results) {
      if (result) valid.push(result);
    }
    if (valid.length > offset) break;
  }

  const picked = valid[offset];
  if (!picked) {
    const timedOut = Date.now() >= deadline;
    return NextResponse.json(
      { error: timedOut ? "封面抓取超时，请手动上传" : "未找到合适的教材封面，请手动上传" },
      { status: timedOut ? 504 : 404 },
    );
  }
  const found = picked.bytes;
  const sourceUrl = picked.url;

  try {
    const contentType = detectImageType(found);
    if (!contentType) {
      return NextResponse.json({ error: "封面格式不支持" }, { status: 415 });
    }
    const normalized = await normalizeTextbookCover(found, contentType);
    const result = await uploadTextbookCover(normalized.bytes, normalized.contentType);
    return NextResponse.json({
      path: result.objectPath,
      url: result.url,
      sourceUrl,
      query,
    });
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("[textbook-cover] storage config missing", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[textbook-cover] upload failed", err.message);
      return NextResponse.json({ error: "封面保存失败" }, { status: 502 });
    }
    console.error("[textbook-cover] unexpected error", err);
    return NextResponse.json({ error: "封面保存失败" }, { status: 502 });
  }
}
