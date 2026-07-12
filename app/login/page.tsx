import { LoginForm } from "@/app/Components/Logins";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Token Management System
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Staff sign-in
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
