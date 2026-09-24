import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repositoryRoot = [process.cwd(), path.resolve(process.cwd(), "..")]
  .find((candidate) => existsSync(path.join(candidate, "contracts", "package.json"))) ?? process.cwd();

function isAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const token = process.env.ZERA_DEPLOY_API_TOKEN;
  return Boolean(token) && request.headers.get("x-zera-deploy-token") === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Deployment recording requires ZERA_DEPLOY_API_TOKEN in production." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    contractAddress?: unknown; transactionId?: unknown; network?: unknown; walletAddress?: unknown;
  } | null;
  const contractAddress = typeof body?.contractAddress === "string" ? body.contractAddress.trim() : "";
  if (!/^[0-9a-fA-F]{64}$/.test(contractAddress)) {
    return NextResponse.json({ error: "A 64-character hexadecimal contract address is required." }, { status: 400 });
  }

  const deployment = {
    contractAddress,
    network: typeof body?.network === "string" ? body.network : "preprod",
    transactionId: typeof body?.transactionId === "string" ? body.transactionId : undefined,
    walletAddress: typeof body?.walletAddress === "string" ? body.walletAddress : undefined,
    deployedAt: new Date().toISOString(), status: "deployed",
  };
  const serialized = `${JSON.stringify(deployment, null, 2)}\n`;
  await Promise.all([
    writeFile(path.join(repositoryRoot, "deployment-contract.json"), serialized, "utf8"),
    writeFile(path.join(repositoryRoot, "deployment.json"), serialized, "utf8"),
  ]);
  return NextResponse.json(deployment, { status: 201 });
}
