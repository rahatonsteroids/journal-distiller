import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AddJournalForm from "./AddJournalForm";
import JournalManager from "./JournalManager";
import LogoutButton from "./LogoutButton";
import { getDb } from "@/lib/prisma";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    redirect("/admin/login");
  }

let journals: any[] = [];
  try {
    const sql = getDb();
    journals = await sql`SELECT id, name, url FROM journals ORDER BY id DESC`;
  } catch (error) {
    console.error("Failed to fetch journals:", error);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>
      <LogoutButton />
      <hr style={{ margin: "20px 0" }} />
      <AddJournalForm />
      <hr style={{ margin: "20px 0" }} />
      <JournalManager journals={journals} />
    </div>
  );
}