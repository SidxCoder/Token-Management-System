"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ALL_ROLES, ROLE_CONFIG, type UserRole } from "@/app/components/logins";
import {
  toApiRole,
  toUserRole,
  type ApiUser,
} from "@/app/components/shared/api";

type UiUser = {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  active: boolean;
};

const roleStyles: Record<UserRole, string> = {
  admin: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cashier: "bg-violet-50 text-violet-700 ring-violet-600/20",
  runner: "bg-amber-50 text-amber-800 ring-amber-600/20",
  packager: "bg-blue-50 text-blue-700 ring-blue-600/20",
  greeter: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const emptyUser = {
  display_name: "",
  username: "",
  password: "",
  role: "runner" as UserRole,
};

function mapUser(user: ApiUser): UiUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: toUserRole(user.role),
    active: user.active,
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<UiUser[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/users");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(
        typeof data?.error === "string" ? data.error : "Failed to load users",
      );
      setUsers([]);
      return;
    }
    setUsers(Array.isArray(data) ? data.map(mapUser) : []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadUsers();
      setLoading(false);
    })();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? users.filter((user) =>
          `${user.display_name} ${user.username} ${user.role}`
            .toLowerCase()
            .includes(search),
        )
      : users;
  }, [query, users]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyUser);
    setShowFormPassword(false);
    setShowForm(true);
  }

  function openEdit(user: UiUser) {
    setEditingId(user.id);
    setForm({
      display_name: user.display_name,
      username: user.username,
      password: "",
      role: user.role,
    });
    setShowFormPassword(false);
    setShowForm(true);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const display_name = form.display_name.trim();
    const username = form.username.trim();
    if (!display_name || !username || (!editingId && !form.password)) return;

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const body: Record<string, string | boolean> = {
          id: editingId,
          display_name,
          role: toApiRole(form.role),
        };
        if (form.password) body.password = form.password;

        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password: form.password,
            display_name,
            role: toApiRole(form.role),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      }

      setShowForm(false);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, role: UserRole) {
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: toApiRole(role) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to update role");
      return;
    }
    await loadUsers();
  }

  async function toggleStatus(id: string, active: boolean) {
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
      return;
    }
    await loadUsers();
  }

  const activeUsers = users.filter((user) => user.active).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-7 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Manage users</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create accounts and control staff access.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <span className="text-lg leading-none">+</span> Add user
        </button>
      </div>

      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:grid-cols-3 sm:px-7">
        <Summary label="Total users" value={users.length} />
        <Summary
          label="Active users"
          value={activeUsers}
          tone="text-emerald-600"
        />
        <Summary
          label="Roles available"
          value={ALL_ROLES.length}
          tone="text-indigo-600"
        />
      </div>

      <div className="p-5 sm:p-7">
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <label className="relative mb-5 block max-w-md">
          <span className="sr-only">Search users</span>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            ⌕
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, username, or role"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {showForm ? (
          <form
            onSubmit={saveUser}
            className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {editingId ? "Edit user" : "New user"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Display name"
                value={form.display_name}
                onChange={(display_name) => setForm({ ...form, display_name })}
                placeholder="e.g. Anaya Singh"
              />
              {!editingId ? (
                <Input
                  label="Username"
                  value={form.username}
                  onChange={(username) => setForm({ ...form, username })}
                  placeholder="e.g. anaya"
                />
              ) : null}
              <PasswordInput
                label={
                  editingId ? "New password (leave blank to keep)" : "Password"
                }
                value={form.password}
                onChange={(password) => setForm({ ...form, password })}
                visible={showFormPassword}
                onToggle={() => setShowFormPassword((current) => !current)}
                required={!editingId}
              />
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role: event.target.value as UserRole,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_CONFIG[role].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create user"}
            </button>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Username</th>
                <th className="px-5 py-3.5">Access role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {initialsFor(user.display_name)}
                        </span>
                        <p className="font-semibold text-slate-800">
                          {user.display_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {user.username}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Change ${user.display_name}'s role`}
                        value={user.role}
                        onChange={(event) =>
                          changeRole(user.id, event.target.value as UserRole)
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset outline-none ${roleStyles[user.role]}`}
                      >
                        {ALL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_CONFIG[role].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleStatus(user.id, user.active)}
                        className={`inline-flex items-center gap-2 text-xs font-semibold ${user.active ? "text-emerald-700" : "text-slate-500"}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                        {user.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openEdit(user)}
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Summary({
  label,
  value,
  tone = "text-slate-900",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  required: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <span className="relative mt-1.5 block">
        <input
          required={required}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Set a sign-in password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-14 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-2 px-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
