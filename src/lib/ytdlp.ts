import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COOKIES_DIR = path.resolve(process.cwd(), ".cache/cookies");

export function getYtDlpPath(): string {
  return process.env.YT_DLP_PATH || "yt-dlp";
}

/**
 * Write user's cookies to a temp file and return the path.
 * Returns null if user has no cookies configured.
 */
export async function getUserCookiesPath(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ytCookies: true },
  });

  if (!user?.ytCookies) return null;

  if (!fs.existsSync(COOKIES_DIR)) {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
  }

  const cookiePath = path.join(COOKIES_DIR, `${session.user.id}.txt`);
  fs.writeFileSync(cookiePath, user.ytCookies);
  return cookiePath;
}

/**
 * Build yt-dlp args with optional cookies.
 * Prepends --cookies flag if user has cookies configured.
 */
export async function withCookies(args: string[]): Promise<string[]> {
  const cookiePath = await getUserCookiesPath();
  if (cookiePath) {
    return ["--cookies", cookiePath, ...args];
  }
  return args;
}

/**
 * Check if a yt-dlp error is likely a cookie/auth issue.
 */
export function isCookieError(error: unknown): boolean {
  const msg = String(error);
  return (
    msg.includes("Sign in to confirm") ||
    msg.includes("sign in") ||
    msg.includes("Use --cookies-from-browser or --cookies") ||
    msg.includes("Login Required") ||
    msg.includes("Private video") ||
    msg.includes("HTTP Error 403") ||
    msg.includes("confirm you're not a bot")
  );
}
