import type { RowDataPacket } from "mysql2";
import { createPool } from "mysql2/promise";
import type { OkPacket } from "mysql2/promise";
import type { NotificationDto } from "../types/NotificationDto";

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
    case "fanticket":
      query = `SELECT uid FROM minetokens;`;
      break;

    case "post":
      query = `SELECT uid FROM posts WHERE status = 0 GROUP BY uid HAVING count(uid) ${Operators[operator]} ?;`;
      break;

    case "metacc":
      query = `SELECT uid FROM assets_minetokens WHERE token_id = 238 AND amount ${Operators[operator]} ?;`;
      break;

    case "follower":
      query = `SELECT fuid AS uid FROM follows WHERE status = 1 GROUP BY fuid HAVING count(uid) ${Operators[operator]} ?;`;
      break;

    case "DEVELOPER":
      query = `SELECT ${process.env.DEVELOPER_USER_ID} AS uid;`
      break;

    default:
      query = "SELECT id AS uid FROM users ORDER BY id;";
      break;
  }

  const [rows] = await pool.query<Array<RowDataPacket>>(query, [amount]);

  return rows.map(row => row["uid"]);
}

export async function addNotification(data: Array<NotificationDto>) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const { userId, invitations } of data) {
      const [announcement] = await connection.execute<OkPacket>("INSERT INTO announcement(sender, title, content, inform_instant) VALUES('admin', ?, ?, 0);", [
        "你得到了 Meta Network 空投邀请码",
        `你好，创作者，感谢你曾经对 Matataki 的支持！<br>` +
        `我们的新产品 Meta Network 已经上线，特此对老用户空投邀请码，欢迎加入！你的邀请码为：<br>` +
        invitations.join("<br>") + "<br><br>" +
        `点击此链接即可开始您的下一代社交网络的探索之旅：<a href="https://meta-network.mttk.net/">https://meta-network.mttk.net/</a><br>` +
        `官方文档：<a href="https://meta-network.mttk.net/">https://meta-network.mttk.net/</a><br>`,
      ]);
      const [event] = await connection.execute<OkPacket>("INSERT INTO notify_event(user_id, action, object_id, object_type, create_time) VALUES(?, 'annouce', ?, 'announcement', NOW());", [
        userId, announcement.insertId,
      ]);
      await connection.execute("INSERT INTO notify_event_recipients(event_id, user_id) VALUES (?, ?);", [event.insertId, userId])

      console.log("Notification added:", userId, invitations);
    }

    await connection.commit();
  } catch (e) {
    await connection.rollback();
    console.error(e);
  } finally {
    connection.release();
  }
}
