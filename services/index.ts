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
      query = `SELECT ${amount} AS uid;`
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
        "Hi，Matataki 的老朋友！<br>还记得那句我们的 Slogan 吗？<br><strong>“发布瞬间，灵感永存!”</strong><br><br>" +
        "——在实现了去中心化存储、完成了社交代币初体验之后，<br>我们决定用一个新的产品，来帮助热情的创造者开启 Web3.0 独立站点！<br><br>" +
        "无需中心平台、可以用 Meta 域名直接访问的 Meta Space，<br>将以社交代币彼此联结，产生价值，组成 Meta Network！<br><br>" +
        '<strong>现在，我们就邀请您前往 <a href="https://home.metanetwork.online/">Meta Network</a>，通过您的邀请码来注册账户：</strong><br>' +
        invitations.join("<br>") + "<br><br>" +
        "您可以在一个真正意义上自己的站点上，<br>来体验到以往必须通过 Matataki 这样的平台来实现的功能。<br>和老朋友们一起探索下一代的社交网络——一个个信息星球组成的数字星系，Meta Network！<br><br>" +
        '<a href="https://home.metanetwork.online/">https://home.metanetwork.online/</a><br>',
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
