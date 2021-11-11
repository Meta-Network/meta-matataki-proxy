import { VercelRequest, VercelResponse } from "@vercel/node";
import { addNotification } from "../services";
import type { NotificationDto } from "../types/NotificationDto";

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(404).json({ message: "NOT_FOUND" });
    return;
  }
  
  if (req.headers.authorization !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    res.status(403).json({ message: "FORBIDDEN" });
    return;
  }

  if (!isValidDto(req.body)) {
    res.status(400).json({ message: "BAD_REQUEST" });
    return;
  }

  res.status(200).json({ data: await addNotification(req.body) });
}

function isValidDto(body: unknown): body is Array<NotificationDto> {
  if (!Array.isArray(body)) {
    return false;
  }
  
  for (const item of body) {
    if (typeof item !== "object" ||
        typeof item.userId !== "number" ||
        !Array.isArray(item.invitations)) {
      return false;
    }

    for (const invitation of item.invitations) {
      if (typeof invitation !== "string") {
        return false;
      } 
    }
  }

  return true;
}
