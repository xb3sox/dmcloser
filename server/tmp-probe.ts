import type { Db } from "./db";

export async function listForCustomer(db: Db, customerId: string) {
  return db.query("SELECT * FROM messages WHERE customer_id=$1", [customerId]);
}