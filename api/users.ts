import { VercelRequest, VercelResponse } from "@vercel/node";

import { queryUsers } from "../services";

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(404).json({ message: 'NOT_FOUND' });
    return;
  }

  if (req.headers.authorization !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    res.status(403).json({ message: "FORBIDDEN" });
    return;
  }

  const { type, operator } = req.query;
  const amount = Number(req.query.amount);

  if (typeof type !== "string" ||
      typeof operator !== "string" || !["eq", "gt", "gte", "lt", "lte"].includes(operator) ||
      Number.isNaN(amount)) {
    res.status(400).json({ message: "BAD_REQUEST" });
    return;
  }

  res.status(200).json({ data: await queryUsers(type, operator, amount) });
}