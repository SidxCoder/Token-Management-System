"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, LockIcon, UserIcon } from "./icons";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error ?? "Unable to sign in. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <UserIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Staff sign-in</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Enter your administrator credentials to continue
          </p>
        </div>
      </div>

      <div className="my-6 h-px bg-slate-200" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
              <UserIcon className="h-5 w-5" />
            </span>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
              <LockIcon className="h-5 w-5" />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            Forgot password?
          </button>
        </div>

        {showHint ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Passwords are managed by your administrator. Ask them to reset yours.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
              </svg>
              Signing in…
            </span>
          ) : "Sign in"}
        </button>
      </form>
    </div>
  );
}
