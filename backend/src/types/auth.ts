import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: "admin" | "user";
  firstName?: string;
  lastName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}
