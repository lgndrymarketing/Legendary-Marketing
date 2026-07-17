import { redirect } from "next/navigation";

// Staff↔client messaging is unified at /messages (the DB + Ably message center,
// which staff can use too) — this admin route just forwards there.
export default function AdminMessagesPage() {
  redirect("/messages");
}
