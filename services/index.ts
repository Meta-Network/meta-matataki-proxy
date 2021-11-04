import type { RowDataPacket } from "mysql2";
import { createPool } from "mysql2/promise";

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: {}
});

enum Operators {
  "eq" = "=",
  "gt" = ">",
  "gte" = ">=",
  "lt" = "<",
  "lte" = "<=",
}

export async function queryUsers(type: string, operator: string, amount: number) {
  let query: string;

  switch (type) {
    case "post":
      query = `SELECT uid FROM posts WHERE status = 0 GROUP BY uid HAVING count(uid) ${Operators[operator]} ?;`;
      break;

    case "metacc":
      query = `SELECT uid FROM assets_minetokens WHERE token_id = 238 AND amount ${Operators[operator]} ?;`;
      break;

    case "follower":
      query = `SELECT fuid AS uid FROM follows WHERE status = 1 GROUP BY fuid HAVING count(uid) ${Operators[operator]} ?;`;
      break;

    default:
      query = "SELECT id AS uid FROM users ORDER BY id;";
      break;
  }

  const [rows] = await pool.query<Array<RowDataPacket>>(query, [amount]);

  return rows.map(row => row["uid"]);
}