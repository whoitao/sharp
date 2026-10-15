// Koa + Prisma 最小验证服务
// 启动：npm run dev（先 prisma generate 再 tsx watch）
// 端口：3002（避开 admin:3001）
// 路由：GET /         → 健康检查
//       GET /questions → 取 question 列表（含 options）

import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import Koa from "koa";

const app = new Koa();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT ?? 3002);

// 显式错误兜底，防止 Prisma 异常直接崩掉进程
app.on("error", (err) => {
  console.error("[koa error]", err);
});

// 健康检查
app.use(async (ctx, next) => {
  if (ctx.path === "/" && ctx.method === "GET") {
    ctx.body = { status: "ok", service: "@sharp/api" };
    return;
  }
  await next();
});

// GET /questions → question 列表 + options
app.use(async (ctx) => {
  if (ctx.path !== "/questions" || ctx.method !== "GET") {
    ctx.status = 404;
    ctx.body = { error: "Not found" };
    return;
  }

  const limit = Math.min(Number(ctx.query.limit ?? 5), 200);
  const offset = Math.max(Number(ctx.query.offset ?? 0), 0);

  try {
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        take: limit,
        skip: offset,
        orderBy: { id: "desc" },
        include: { options: { orderBy: { sortNo: "asc" } } },
      }),
      prisma.question.count(),
    ]);

    // BigInt 序列化
    ctx.body = {
      count: questions.length,
      total,
      limit,
      offset,
      data: questions.map((q) => ({
        ...q,
        id: q.id.toString(),
        categoryId: q.categoryId.toString(),
        options: q.options.map((o) => ({
          ...o,
          id: o.id.toString(),
          questionId: o.questionId.toString(),
        })),
      })),
    };
  } catch (err) {
    console.error("[GET /questions] failed:", err);
    ctx.status = 500;
    ctx.body = {
      error: "Database query failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
});

app.listen(PORT, async () => {
  console.log(`@sharp/api listening on http://localhost:${PORT}`);
  // 启动时探一下数据库，避免运行时才发现连接问题
  try {
    await prisma.$connect();
    const c = await prisma.question.count();
    console.log(`DB OK — questions total: ${c}`);
  } catch (e) {
    console.error("DB connection failed on startup:", e);
    // 不立即退出，让健康检查也能反馈错误
  }
});
