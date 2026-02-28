import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const COOKIE_NAME = "admin_token"

export function signToken() {
  return jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  )
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!)
  } catch {
    return null
  }
}

export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null
  return verifyToken(token)
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", {
    maxAge: 0,
    path: "/",
  })
}