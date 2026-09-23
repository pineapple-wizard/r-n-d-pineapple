import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { RdBoard } from "@/app/components/rd-board";
import { createClient } from "@/lib/supabase/server";
import { isItemStatus, type Item, type Profile } from "@/lib/rd/model";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName =
    typeof user.user_metadata.first_name === "string" &&
    user.user_metadata.first_name
      ? user.user_metadata.first_name
      : "there";

  const [itemsResult, profilesResult] = await Promise.all([
    supabase
      .from("items")
      .select(
        "id, parent_id, name, date_requested, date_received, status, date_completed, notes, recap_form_url, created_at, item_owners(user_id)",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .order("first_name", { ascending: true }),
  ]);

  const schemaMissing = itemsResult.error?.code === "PGRST205";

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-black/60">Hello, {firstName}!</p>
          <h1 className="text-2xl font-semibold tracking-tight">Pineapple R&D</h1>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="h-10 rounded-full border border-black bg-white px-4 text-sm font-medium text-black"
          >
            Log out
          </button>
        </form>
      </header>

      {schemaMissing ? (
        <SchemaNotice />
      ) : itemsResult.error || profilesResult.error ? (
        <p className="text-sm text-red-600" role="alert">
          {itemsResult.error?.message ?? profilesResult.error?.message}
        </p>
      ) : (
        <RdBoard
          profiles={mapProfiles(profilesResult.data ?? [])}
          items={mapItems(itemsResult.data ?? [])}
        />
      )}
    </main>
  );
}

function SchemaNotice() {
  return (
    <div className="max-w-xl rounded-2xl border border-black/10 bg-white p-5 text-sm leading-6">
      <p className="font-medium">The R&D table is not in Supabase yet.</p>
      <p className="mt-2 text-black/60">
        Open the SQL editor and run <code>supabase/items.sql</code>. Then reload
        this page.
      </p>
    </div>
  );
}

function mapProfiles(
  rows: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>,
): Profile[] {
  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  }));
}

function mapItems(
  rows: Array<{
    id: string;
    parent_id: string | null;
    name: string;
    date_requested: string | null;
    date_received: string | null;
    status: string;
    date_completed: string | null;
    notes: string;
    recap_form_url: string | null;
    created_at: string;
    item_owners: Array<{ user_id: string }> | null;
  }>,
): Item[] {
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    dateRequested: row.date_requested,
    dateReceived: row.date_received,
    status: isItemStatus(row.status) ? row.status : "not_started",
    dateCompleted: row.date_completed,
    notes: row.notes,
    recapFormUrl: row.recap_form_url,
    ownerIds: (row.item_owners ?? []).map((owner) => owner.user_id),
    createdAt: row.created_at,
  }));
}
