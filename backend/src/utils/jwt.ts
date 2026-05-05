import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";

export type JwtPayload = {
  id: number;
  username: string;
  role: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
