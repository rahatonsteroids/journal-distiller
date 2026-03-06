import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname === "/profile" && !userId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if ((pathname === "/auth/login" || pathname === "/auth/signup") && userId) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/auth/login", "/auth/signup"],
};
