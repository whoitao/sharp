// 烟台 2025 中考生物 25 道题：base64 图片 → Supabase Storage URL
// 用法：
//   迁移：cd apps/admin && npx tsx prisma/migrate-yantai-2025-bio-images.ts
//   回滚：cd apps/admin && npx tsx prisma/migrate-yantai-2025-bio-images.ts --rollback
//         （可加 --backup=/绝对路径.json 指定备份文件，默认取最新一份）
// 说明：
//   - 只处理 id 33247~33271；
//   - 上传走 lib/storage 的 uploadQuestionImage（bucket sharpbucket，questions/{uuid}.png）；
//   - 迁移前把 25 行原始 content/analysis/options 备份到仓库之外（~/.local/share/sharp-backups）；
//   - 幂等：字段里已无 data URI 的自动跳过，不重复上传。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prismaBase = new PrismaClient();

const ID_MIN = BigInt(33247);
const ID_MAX = BigInt(33271);
const ASSET_DIR = join(__dirname, "data", "assets", "yantai-2025-bio");
const BACKUP_DIR = join(homedir(), ".local", "share", "sharp-backups");
const BACKUP_PREFIX = "yantai-2025-bio-";

type UploadRecord = {
  questionId: string;
  field: "content" | "analysis" | "option";
  optionId?: string;
  optionKey?: string;
  file?: string;
  sha256: string;
  bytes: number;
  objectPath: string;
  url: string;
};

type BackupFile = {
  createdAt: string;
  idRange: string;
  questions: {
    id: string;
    content: string;
    analysis: string | null;
    options: { id: string; optionKey: string; content: string }[];
  }[];
  uploads: UploadRecord[];
};

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 6): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const transient =
        e?.code === "P1017" || e?.code === "P1001" || e?.code === "P2024" ||
        /closed the connection|ECONNRESET|timed out|Can't reach database/i.test(String(e?.message));
      if (!transient || i === attempts) throw e;
      console.warn(`  ⚠ ${label} 连接异常（${e?.code ?? "unknown"}），第 ${i} 次重试...`);
      try { await prismaBase.$disconnect(); } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 1000 * i));
      try { await prismaBase.$connect(); } catch { /* ignore */ }
    }
  }
  throw lastErr;
}

const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return withRetry(() => query(args), "db");
      },
    },
  },
});

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** 本地 PNG → sha256，用于把 DB 里的 data URI 与源文件名对应起来 */
function localFileHashes(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(ASSET_DIR)) return map;
  for (const name of readdirSync(ASSET_DIR)) {
    if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;
    const bytes = new Uint8Array(readFileSync(join(ASSET_DIR, name)));
    map.set(sha256(bytes), name);
  }
  return map;
}

function decodeDataUri(uri: string): { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" } {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.*)$/s.exec(uri);
  if (!m) throw new Error(`无法识别的 data URI: ${uri.slice(0, 60)}`);
  const bytes = new Uint8Array(Buffer.from(m[2], "base64"));
  return { bytes, contentType: m[1] as "image/png" | "image/jpeg" | "image/webp" };
}

const SRC_DATA_URI_RE = /src="(data:image\/(?:png|jpeg|webp);base64,[^"]+)"/g;

function latestBackup(): string {
  if (!existsSync(BACKUP_DIR)) throw new Error(`备份目录不存在：${BACKUP_DIR}`);
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error("没有找到备份文件，无法回滚。");
  return join(BACKUP_DIR, files[files.length - 1]);
}

function parseBackupArg(): string | null {
  const arg = process.argv.find(a => a.startsWith("--backup="));
  return arg ? arg.slice("--backup=".length) : null;
}

async function deleteObject(objectPath: string) {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_AVATAR_BUCKET ?? "sharpbucket";
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未配置，无法删除 Storage 对象。");
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`删除对象失败 ${objectPath}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

async function rollback() {
  const path = parseBackupArg() ?? latestBackup();
  const backup: BackupFile = JSON.parse(readFileSync(path, "utf8"));
  console.log(`回滚备份：${path}`);
  console.log(`  原始题目 ${backup.questions.length} 道，上传记录 ${backup.uploads.length} 条`);

  let restoredFields = 0;
  for (const q of backup.questions) {
    await withRetry(
      () => prisma.question.update({ where: { id: BigInt(q.id) }, data: { content: q.content, analysis: q.analysis } }),
      `回滚题干 ${q.id}`,
    );
    restoredFields += 2;
    for (const o of q.options) {
      // 选项可能被 seed 重建过（id 变化），按 questionId + optionKey 还原更稳
      const r = await withRetry(
        () =>
          prisma.questionOption.updateMany({
            where: { questionId: BigInt(q.id), optionKey: o.optionKey },
            data: { content: o.content },
          }),
        `回滚选项 ${q.id}/${o.optionKey}`,
      );
      restoredFields += r.count;
    }
  }

  let deleted = 0;
  for (const u of backup.uploads) {
    await deleteObject(u.objectPath);
    deleted++;
  }

  console.log(`已恢复字段 ${restoredFields} 个，删除 Storage 对象 ${deleted} 个。`);
  const remain = await prisma.question.count({
    where: {
      id: { gte: ID_MIN, lte: ID_MAX },
      OR: [
        { content: { contains: "data:image" } },
        { analysis: { contains: "data:image" } },
        { options: { some: { content: { contains: "data:image" } } } },
      ],
    },
  });
  console.log(`回滚后仍含 data:image 的题目：${remain} 道（应为回滚前的原始状态）。`);
}

async function migrate() {
  console.log("=== 烟台 2025 中考生物：图片迁移到 Storage ===\n");

  const questions = await withRetry(
    () =>
      prisma.question.findMany({
        where: { id: { gte: ID_MIN, lte: ID_MAX } },
        select: {
          id: true,
          content: true,
          analysis: true,
          options: { select: { id: true, optionKey: true, content: true }, orderBy: { sortNo: "asc" } },
        },
        orderBy: { id: "asc" },
      }),
    "读取题目",
  );
  if (questions.length !== 25) {
    throw new Error(`预期 25 道题，实际读取 ${questions.length} 道，已中止。`);
  }
  console.log(`读取题目 ${questions.length} 道`);

  // 1. 备份（仓库之外）
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `${BACKUP_PREFIX}${stamp}.json`);
  const backup: BackupFile = {
    createdAt: new Date().toISOString(),
    idRange: `${ID_MIN}~${ID_MAX}`,
    questions: questions.map(q => ({
      id: String(q.id),
      content: q.content,
      analysis: q.analysis,
      options: q.options.map(o => ({ id: String(o.id), optionKey: o.optionKey, content: o.content })),
    })),
    uploads: [],
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`已备份到：${backupPath}`);

  const hashes = localFileHashes();
  console.log(`本地源图 ${hashes.size} 张（用于映射文件名）`);

  // storage 模块在 PrismaClient 加载 .env 之后动态引入，确保读取到 SUPABASE_* 变量
  const { uploadQuestionImage } = await import("../lib/storage");

  let uploaded = 0;
  let updatedFields = 0;
  let skippedFields = 0;

  async function processText(
    text: string,
    meta: { questionId: string; field: "content" | "analysis" | "option"; optionId?: string; optionKey?: string },
  ): Promise<{ next: string; changed: boolean }> {
    const matches = [...text.matchAll(SRC_DATA_URI_RE)];
    if (matches.length === 0) return { next: text, changed: false };

    let next = text;
    for (const m of matches) {
      const uri = m[1];
      const { bytes, contentType } = decodeDataUri(uri);
      const hash = sha256(bytes);
      const file = hashes.get(hash);
      const result = await uploadQuestionImage(bytes, contentType);
      next = next.replace(uri, result.url);
      uploaded++;
      backup.uploads.push({
        ...meta,
        file,
        sha256: hash,
        bytes: bytes.length,
        objectPath: result.objectPath,
        url: result.url,
      });
      // 每条上传后落盘，避免中途失败丢失 objectPath
      writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
      console.log(`  ↑ ${meta.questionId}/${meta.field}${meta.optionKey ? meta.optionKey : ""} ${file ?? hash.slice(0, 8)} → ${result.objectPath}`);
    }
    return { next, changed: next !== text };
  }

  // 2. 逐条上传并替换
  for (const q of questions) {
    const qid = String(q.id);

    const content = await processText(q.content, { questionId: qid, field: "content" });
    if (content.changed) {
      await withRetry(
        () => prisma.question.update({ where: { id: q.id }, data: { content: content.next } }),
        `更新题干 ${qid}`,
      );
      updatedFields++;
    } else skippedFields++;

    const analysis = q.analysis ? await processText(q.analysis, { questionId: qid, field: "analysis" }) : { next: q.analysis ?? "", changed: false };
    if (analysis.changed) {
      await withRetry(
        () => prisma.question.update({ where: { id: q.id }, data: { analysis: analysis.next } }),
        `更新解析 ${qid}`,
      );
      updatedFields++;
    }

    for (const o of q.options) {
      const opt = await processText(o.content, {
        questionId: qid,
        field: "option",
        optionId: String(o.id),
        optionKey: o.optionKey,
      });
      if (opt.changed) {
        await withRetry(
          () => prisma.questionOption.update({ where: { id: o.id }, data: { content: opt.next } }),
          `更新选项 ${o.id}`,
        );
        updatedFields++;
      }
    }
  }

  // 3. 自查
  const remain = await prisma.question.findMany({
    where: {
      id: { gte: ID_MIN, lte: ID_MAX },
      OR: [
        { content: { contains: "data:image" } },
        { analysis: { contains: "data:image" } },
        { options: { some: { content: { contains: "data:image" } } } },
      ],
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const finalRows = await prisma.question.findMany({
    where: { id: { gte: ID_MIN, lte: ID_MAX } },
    select: { id: true, content: true, analysis: true, options: { select: { content: true } } },
    orderBy: { id: "asc" },
  });
  const srcs: string[] = [];
  for (const q of finalRows) {
    for (const text of [q.content, q.analysis ?? "", ...q.options.map(o => o.content)]) {
      for (const m of text.matchAll(/<img[^>]+src="([^"]+)"/g)) srcs.push(m[1]);
    }
  }
  const badSrc = srcs.filter(s => !/^https:\/\/.+\.supabase\.co\/storage\/v1\/object\/public\/.+\/questions\//.test(s));

  console.log("\n=== 迁移结果 ===");
  console.log(`  上传图片：${uploaded} 张`);
  console.log(`  更新字段：${updatedFields} 个（跳过无图字段 ${skippedFields} 个题干）`);
  console.log(`  剩余 data:image 题目：${remain.length} 道`);
  console.log(`  <img> 总数：${srcs.length}，非 Storage 引用：${badSrc.length}`);
  console.log(`  备份与映射：${backupPath}`);
  if (remain.length > 0) throw new Error(`仍有 ${remain.length} 道题包含 data:image，请检查。`);
  if (badSrc.length > 0) throw new Error(`存在 ${badSrc.length} 个非 Storage 图片引用：${badSrc.slice(0, 3).join(", ")}`);
}

const isRollback = process.argv.includes("--rollback");
(isRollback ? rollback() : migrate())
  .catch(e => {
    console.error("\n❌ 执行失败：", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaBase.$disconnect();
  });
