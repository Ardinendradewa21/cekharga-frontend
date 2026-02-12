import { NextResponse } from "next/server";

export function jsonSuccess<T>(
  data: T,
  message = "OK",
  init?: ResponseInit,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: true,
      status: "success",
      data,
      message,
      ...extra,
    },
    init,
  );
}

export function jsonError(message: string, status = 400, data: unknown = null) {
  return NextResponse.json(
    {
      success: false,
      status: "error",
      data,
      message,
    },
    { status },
  );
}
