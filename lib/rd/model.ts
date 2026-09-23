export const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
] as const;

export type ItemStatus = (typeof STATUSES)[number]["value"];

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type Item = {
  id: string;
  parentId: string | null;
  name: string;
  dateRequested: string | null;
  dateReceived: string | null;
  status: ItemStatus;
  dateCompleted: string | null;
  notes: string;
  recapFormUrl: string | null;
  ownerIds: string[];
  createdAt: string;
};

export type ItemGroup = {
  parent: Item;
  subitems: Item[];
};

export function isItemStatus(value: string): value is ItemStatus {
  return STATUSES.some((status) => status.value === value);
}

export function statusLabel(status: ItemStatus) {
  return STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function fullName(profile: Profile) {
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  return name || profile.email;
}

export function displayName(profile: Profile, profiles: Profile[]) {
  const name = fullName(profile);
  const sharesName =
    profiles.filter((other) => fullName(other) === name).length > 1;
  return sharesName ? `${name} (${profile.email})` : name;
}

export function mentionLabel(profile: Profile, profiles: Profile[]) {
  return `@${displayName(profile, profiles)}`;
}

export function mentionsInNotes(notes: string, profiles: Profile[]) {
  return profiles
    .filter((profile) => notes.includes(mentionLabel(profile, profiles)))
    .map((profile) => profile.id);
}

export function partitionBoard(items: Item[]) {
  const byCreatedAt = (a: Item, b: Item) =>
    a.createdAt.localeCompare(b.createdAt);

  const parents = items
    .filter((item) => item.parentId === null)
    .sort(byCreatedAt);
  const parentIds = new Set(parents.map((item) => item.id));

  const subitemsOf = (parentId: string) =>
    items
      .filter((item) => item.parentId === parentId)
      .sort(byCreatedAt);

  const active: ItemGroup[] = [];
  const completed: ItemGroup[] = [];

  for (const parent of parents) {
    const group = { parent, subitems: subitemsOf(parent.id) };
    if (parent.status === "completed") {
      completed.push(group);
    } else {
      active.push(group);
    }
  }

  const orphans = items.filter(
    (item) => item.parentId !== null && !parentIds.has(item.parentId),
  );
  for (const orphan of orphans.sort(byCreatedAt)) {
    active.push({ parent: orphan, subitems: [] });
  }

  return { active, completed };
}

export function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
