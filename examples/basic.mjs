import { createDb } from "@eliware/elera-client";

const db = await createDb();
try {
  const [rows] = await db.query("SELECT 1 AS connected");
  console.log(rows);
} finally {
  await db.end();
}
