"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isItemStatus,
  type ItemStatus,
} from "@/lib/rd/model";

export type ItemInput = {
  id?: string;
  parentId: string | null;
  name: string;
  dateRequested: string | null;
  dateReceived: string | null;
  status: ItemStatus;
  dateCompleted: string | null;
  notes: string;
  recapFormUrl: string | null;
  ownerIds: string[];
  mentionIds: string[];
};

type ActionResult = { error?: string };

function cleanDate(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return value;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

export async function saveItem(input: ItemInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to log in." };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "Device / Project Description is required." };
  }
  if (name.length > 500) {
    return { error: "Name must be 500 characters or fewer." };
  }
  if (!isItemStatus(input.status)) {
    return { error: "Choose a valid status." };
  }
  if (input.notes.length > 10000) {
    return { error: "Notes must be 10,000 characters or fewer." };
  }

  const dateRequested = cleanDate(input.dateRequested);
  const dateReceived = cleanDate(input.dateReceived);
  const dateCompleted = cleanDate(input.dateCompleted);
  if (
    dateRequested === undefined ||
    dateReceived === undefined ||
    dateCompleted === undefined
  ) {
    return { error: "Enter dates as a calendar day." };
  }

  const recapFormUrl = input.recapFormUrl?.trim() || null;
  if (recapFormUrl && !/^https?:\/\//i.test(recapFormUrl)) {
    return { error: "The recap form link must start with http:// or https://." };
  }

  const ownerIds = uniqueIds(input.ownerIds);
  const mentionIds = uniqueIds(input.mentionIds);
  const linkedIds = uniqueIds([...ownerIds, ...mentionIds]);

  if (linkedIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .in("id", linkedIds);

    if (error) {
      return { error: error.message };
    }

    const known = new Set(profiles?.map((profile) => profile.id));
    if (linkedIds.some((id) => !known.has(id))) {
      return { error: "One of the selected people is no longer available." };
    }
  }

  if (!input.id && input.parentId) {
    const { data: parent, error } = await supabase
      .from("items")
      .select("id, parent_id")
      .eq("id", input.parentId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }
    if (!parent || parent.parent_id) {
      return { error: "Subitems can only be added to a top-level item." };
    }
  }

  const row = {
    name,
    date_requested: dateRequested,
    date_received: dateReceived,
    status: input.status,
    date_completed: input.status === "completed" ? dateCompleted : null,
    notes: input.notes,
    recap_form_url: recapFormUrl,
  };

  let itemId = input.id;

  if (itemId) {
    const { error } = await supabase.from("items").update(row).eq("id", itemId);
    if (error) {
      return { error: error.message };
    }
  } else {
    const { data, error } = await supabase
      .from("items")
      .insert({ ...row, parent_id: input.parentId })
      .select("id")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not create the item." };
    }
    itemId = data.id;
  }

  if (!itemId) {
    return { error: "Could not save the item." };
  }

  const ownerError = await replaceUsers(
    supabase,
    "item_owners",
    itemId,
    ownerIds,
  );
  if (ownerError) {
    return { error: ownerError };
  }

  const mentionError = await replaceUsers(
    supabase,
    "item_mentions",
    itemId,
    mentionIds,
  );
  if (mentionError) {
    return { error: mentionError };
  }

  revalidatePath("/");
  return {};
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to log in." };
  }

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}

async function replaceUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "item_owners" | "item_mentions",
  itemId: string,
  userIds: string[],
) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("item_id", itemId);

  if (deleteError) {
    return deleteError.message;
  }

  if (userIds.length === 0) {
    return null;
  }

  const { error } = await supabase.from(table).insert(
    userIds.map((userId) => ({
      item_id: itemId,
      user_id: userId,
    })),
  );

  return error?.message ?? null;
}
