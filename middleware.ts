import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const pathname = request.nextUrl.pathname;

  // If trying to access profile without login, redirect to login
  if (pathname === "/profile" && !userId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If logged in and trying to access login/signup, redirect to profile
  if ((pathname === "/auth/login" || pathname === "/auth/signup") && userId) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/auth/login", "/auth/signup"],
};
