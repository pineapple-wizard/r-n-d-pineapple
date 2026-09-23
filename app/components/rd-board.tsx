"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteItem, saveItem, type ItemInput } from "@/app/actions/items";
import {
  STATUSES,
  displayName,
  localToday,
  mentionLabel,
  mentionsInNotes,
  partitionBoard,
  statusLabel,
  type Item,
  type ItemGroup,
  type ItemStatus,
  type Profile,
} from "@/lib/rd/model";

const statusTone: Record<ItemStatus, string> = {
  not_started: "border border-black/20 bg-white text-black",
  in_progress: "bg-accent text-black",
  blocked: "bg-black text-white",
  completed: "border border-accent bg-white text-black",
};

export function RdBoard({
  profiles,
  items,
}: {
  profiles: Profile[];
  items: Item[];
}) {
  const [view, setView] = useState<"active" | "completed">("active");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { active, completed } = useMemo(() => partitionBoard(items), [items]);
  const groups = view === "active" ? active : completed;

  function openCreate(parentId: string | null) {
    setDraft(emptyDraft(parentId));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <ViewButton
            selected={view === "active"}
            onClick={() => setView("active")}
            label="Pineapple R&D"
            count={active.length}
          />
          <ViewButton
            selected={view === "completed"}
            onClick={() => setView("completed")}
            label="Completed R&D"
            count={completed.length}
          />
        </div>
        <button
          type="button"
          onClick={() => openCreate(null)}
          className="h-10 rounded-full bg-accent px-4 text-sm font-medium text-black"
        >
          Add item
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="text-xs tracking-wide text-black/50 uppercase">
            <tr className="border-b-2 border-accent">
              <th className="px-4 py-3 font-medium">Device / Project Description</th>
              <th className="px-3 py-3 font-medium">Owner</th>
              <th className="px-3 py-3 font-medium">Date Requested</th>
              <th className="px-3 py-3 font-medium">Date Received</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Date Completed</th>
              <th className="px-3 py-3 font-medium">Notes</th>
              <th className="px-3 py-3 font-medium">
                Product Evaluation Recap Form Link
              </th>
              <th className="px-3 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-black/50">
                  {view === "active"
                    ? "No active items yet."
                    : "No completed items yet. A parent item moves here when its status is Completed."}
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <ItemGroupRows
                  key={group.parent.id}
                  group={group}
                  profiles={profiles}
                  collapsed={collapsed.includes(group.parent.id)}
                  onToggle={() =>
                    setCollapsed((current) =>
                      current.includes(group.parent.id)
                        ? current.filter((id) => id !== group.parent.id)
                        : [...current, group.parent.id],
                    )
                  }
                  onEdit={(item) => setDraft(draftFromItem(item))}
                  onAddSubitem={() => openCreate(group.parent.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <ItemDialog
          draft={draft}
          profiles={profiles}
          onClose={() => setDraft(null)}
        />
      )}
    </section>
  );
}

function ViewButton({
  selected,
  onClick,
  label,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm font-medium ${
        selected
          ? "bg-accent text-black"
          : "border border-black/15 bg-white text-black"
      }`}
    >
      {label}
      <span className="ml-2 text-xs opacity-70">{count}</span>
    </button>
  );
}

function ItemGroupRows({
  group,
  profiles,
  collapsed,
  onToggle,
  onEdit,
  onAddSubitem,
}: {
  group: ItemGroup;
  profiles: Profile[];
  collapsed: boolean;
  onToggle: () => void;
  onEdit: (item: Item) => void;
  onAddSubitem: () => void;
}) {
  return (
    <>
      <ItemRow
        item={group.parent}
        profiles={profiles}
        subitem={false}
        subitemCount={group.subitems.length}
        collapsed={collapsed}
        onToggle={onToggle}
        onEdit={() => onEdit(group.parent)}
        onAddSubitem={onAddSubitem}
      />
      {!collapsed &&
        group.subitems.map((subitem) => (
          <ItemRow
            key={subitem.id}
            item={subitem}
            profiles={profiles}
            subitem
            onEdit={() => onEdit(subitem)}
          />
        ))}
    </>
  );
}

function ItemRow({
  item,
  profiles,
  subitem,
  subitemCount = 0,
  collapsed = false,
  onToggle,
  onEdit,
  onAddSubitem,
}: {
  item: Item;
  profiles: Profile[];
  subitem: boolean;
  subitemCount?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  onEdit: () => void;
  onAddSubitem?: () => void;
}) {
  const owners = profiles.filter((profile) => item.ownerIds.includes(profile.id));

  return (
    <tr className="border-b border-black/5 align-top last:border-b-0">
      <td className={`px-4 py-3 ${subitem ? "pl-10" : ""}`}>
        <div className="flex items-start gap-2">
          {!subitem && subitemCount > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-0.5 text-black/50"
              aria-label={collapsed ? "Show subitems" : "Hide subitems"}
            >
              {collapsed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="mt-0.5 w-3 text-black/25">{subitem ? "↳" : ""}</span>
          )}
          <div>
            <p className="font-medium">{item.name}</p>
            {!subitem && (
              <button
                type="button"
                onClick={onAddSubitem}
                className="mt-1 text-xs text-black/60 underline decoration-accent"
              >
                Add subitem
              </button>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {owners.length === 0 ? (
          <span className="text-black/35">—</span>
        ) : (
          <span>{owners.map((owner) => displayName(owner, profiles)).join(", ")}</span>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.dateRequested)}</td>
      <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.dateReceived)}</td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[item.status]}`}
        >
          {statusLabel(item.status)}
        </span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.dateCompleted)}</td>
      <td className="max-w-xs px-3 py-3">
        <NotesText notes={item.notes} profiles={profiles} />
      </td>
      <td className="px-3 py-3">
        {item.recapFormUrl ? (
          <a
            href={item.recapFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open
          </a>
        ) : (
          <span className="text-black/35">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <button type="button" onClick={onEdit} className="text-sm underline">
          Edit
        </button>
      </td>
    </tr>
  );
}

function NotesText({ notes, profiles }: { notes: string; profiles: Profile[] }) {
  if (!notes.trim()) {
    return <span className="text-black/35">—</span>;
  }

  const labels = profiles
    .map((profile) => mentionLabel(profile, profiles))
    .sort((a, b) => b.length - a.length);
  const parts: Array<{ text: string; mention: boolean }> = [];
  let remaining = notes;

  while (remaining.length > 0) {
    let match: { index: number; label: string } | null = null;
    for (const label of labels) {
      const index = remaining.indexOf(label);
      if (index === -1) continue;
      if (
        !match ||
        index < match.index ||
        (index === match.index && label.length > match.label.length)
      ) {
        match = { index, label };
      }
    }

    if (!match) {
      parts.push({ text: remaining, mention: false });
      break;
    }

    if (match.index > 0) {
      parts.push({ text: remaining.slice(0, match.index), mention: false });
    }
    parts.push({ text: match.label, mention: true });
    remaining = remaining.slice(match.index + match.label.length);
  }

  return (
    <p className="line-clamp-3 whitespace-pre-wrap">
      {parts.map((part, index) =>
        part.mention ? (
          <span key={index} className="rounded bg-accent/35 px-0.5 font-medium text-black">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}

type Draft = ItemInput;

function emptyDraft(parentId: string | null): Draft {
  return {
    parentId,
    name: "",
    dateRequested: null,
    dateReceived: null,
    status: "not_started",
    dateCompleted: null,
    notes: "",
    recapFormUrl: null,
    ownerIds: [],
    mentionIds: [],
  };
}

function draftFromItem(item: Item): Draft {
  return {
    id: item.id,
    parentId: item.parentId,
    name: item.name,
    dateRequested: item.dateRequested,
    dateReceived: item.dateReceived,
    status: item.status,
    dateCompleted: item.dateCompleted,
    notes: item.notes,
    recapFormUrl: item.recapFormUrl,
    ownerIds: item.ownerIds,
    mentionIds: [],
  };
}

function ItemDialog({
  draft,
  profiles,
  onClose,
}: {
  draft: Draft;
  profiles: Profile[];
  onClose: () => void;
}) {
  const [form, setForm] = useState(draft);
  const [error, setError] = useState<string>();
  const [mentionQuery, setMentionQuery] = useState<{
    at: number;
    query: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const isSubitem = form.parentId !== null;

  const mentionMatches = mentionQuery
    ? profiles
        .filter((profile) => {
          const haystack = `${displayName(profile, profiles)} ${profile.email}`.toLowerCase();
          return haystack.includes(mentionQuery.query.toLowerCase());
        })
        .slice(0, 8)
    : [];

  function patch(partial: Partial<Draft>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function changeStatus(status: ItemStatus) {
    patch({
      status,
      dateCompleted:
        status === "completed" ? form.dateCompleted || localToday() : null,
    });
  }

  function insertMention(profile: Profile) {
    if (!mentionQuery) return;
    const label = mentionLabel(profile, profiles);
    const cursor = mentionQuery.at + mentionQuery.query.length + 1;
    const nextNotes = `${form.notes.slice(0, mentionQuery.at)}${label} ${form.notes.slice(cursor)}`;
    patch({ notes: nextNotes });
    setMentionQuery(null);
  }

  function onNotesChange(value: string, cursor: number) {
    patch({ notes: value });
    const before = value.slice(0, cursor);
    const at = before.lastIndexOf("@");
    if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]))) {
      setMentionQuery(null);
      return;
    }
    const query = before.slice(at + 1);
    if (query.includes("\n") || query.endsWith(" ")) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery({ at, query });
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveItem({
        ...form,
        name: form.name,
        mentionIds: mentionsInNotes(form.notes, profiles),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  function remove() {
    if (!form.id) return;
    const message = isSubitem
      ? `Delete ${form.name || "this subitem"}?`
      : `Delete ${form.name || "this item"} and its subitems?`;
    if (!window.confirm(message)) return;

    setError(undefined);
    startTransition(async () => {
      const result = await deleteItem(form.id!);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-dialog-title"
        className="w-full max-w-lg rounded-2xl border-t-4 border-accent bg-white p-6 text-black shadow-xl"
      >
        <h2 id="item-dialog-title" className="text-xl font-semibold">
          {form.id ? "Edit" : "Add"} {isSubitem ? "subitem" : "item"}
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Device / Project Description
            <input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              className={controlClass}
            />
          </label>

          <fieldset className="flex flex-col gap-2 text-sm font-medium">
            <legend>Owner</legend>
            {profiles.length === 0 ? (
              <p className="font-normal text-black/50">
                No people yet. Owners come from signed-up users.
              </p>
            ) : (
              <div className="max-h-36 overflow-auto rounded-lg border border-black/10 bg-white p-2 font-normal">
                {profiles.map((profile) => (
                  <label key={profile.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={form.ownerIds.includes(profile.id)}
                      onChange={(event) =>
                        patch({
                          ownerIds: event.target.checked
                            ? [...form.ownerIds, profile.id]
                            : form.ownerIds.filter((id) => id !== profile.id),
                        })
                      }
                    />
                    {displayName(profile, profiles)}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Date Requested"
              value={form.dateRequested}
              onChange={(dateRequested) => patch({ dateRequested })}
            />
            <DateField
              label="Date Received"
              value={form.dateReceived}
              onChange={(dateReceived) => patch({ dateReceived })}
            />
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Status
            <select
              value={form.status}
              onChange={(event) => changeStatus(event.target.value as ItemStatus)}
              className={controlClass}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          {form.status === "completed" && (
            <DateField
              label="Date Completed"
              value={form.dateCompleted}
              onChange={(dateCompleted) => patch({ dateCompleted })}
            />
          )}
          {isSubitem && form.status === "completed" && (
            <p className="text-sm text-black/50">
              A completed subitem stays on the main board until its parent is
              completed.
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Notes
            <textarea
              value={form.notes}
              rows={4}
              onChange={(event) =>
                onNotesChange(
                  event.target.value,
                  event.target.selectionStart ?? event.target.value.length,
                )
              }
              onClick={(event) =>
                onNotesChange(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                )
              }
              placeholder="Type @ to mention someone"
              className={textAreaClass}
            />
          </label>
          {mentionQuery && (
            <div className="rounded-lg border border-black/10 bg-white">
              {mentionMatches.length === 0 ? (
                <p className="px-3 py-2 text-sm text-black/50">No matching people</p>
              ) : (
                mentionMatches.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => insertMention(profile)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent/30"
                  >
                    {displayName(profile, profiles)}
                  </button>
                ))
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Product Evaluation Recap Form Link
            <input
              value={form.recapFormUrl ?? ""}
              onChange={(event) =>
                patch({ recapFormUrl: event.target.value || null })
              }
              placeholder="https://docs.google.com/..."
              className={controlClass}
            />
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {form.id ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-sm text-red-600 underline"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-full border border-black bg-white px-4 text-sm text-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="h-10 rounded-full bg-accent px-4 text-sm font-medium text-black disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className={controlClass}
      />
    </label>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

const controlClass =
  "h-10 rounded-lg border border-black/15 bg-white px-3 font-normal outline-none focus:border-accent";

const textAreaClass =
  "min-h-28 rounded-lg border border-black/15 bg-white px-3 py-2 font-normal outline-none focus:border-accent";
