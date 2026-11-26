import { NextRequest, NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type RouteCtx = { params: Promise<Record<string, string>> };

export function handle(fn: (req: NextRequest, ctx: RouteCtx) => Promise<Response | object>) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<Response> => {
    try {
      const res = await fn(req, ctx);
      if (res instanceof Response) return res;
      return NextResponse.json(res);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      // unique violation
      if (/duplicate key|unique constraint/i.test(msg)) {
        return NextResponse.json({ error: "That value already exists." }, { status: 409 });
      }
      if (/foreign key|violates/i.test(msg)) {
        return NextResponse.json({ error: "Operation blocked by related data." }, { status: 409 });
      }
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
