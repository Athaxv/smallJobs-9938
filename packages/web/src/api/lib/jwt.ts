import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.BETTER_AUTH_SECRET ?? "fallback-dev-secret-change-me"
);

const EXPIRY = "1d";

export interface JWTPayload {
  sub: string;   // user.id
  email: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
