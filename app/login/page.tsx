import { LoginForm } from "@/app/components/login";
import { ShieldLock } from "@/app/components/login/icons";

export default function LoginPage() {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen w-full flex-1 bg-slate-100 text-slate-900">
      {/* Left brand panel */}
      <aside className="relative hidden w-[30rem] shrink-0 overflow-hidden text-white lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#152a63] to-[#0b1533]" />
        {/* Subtle dot texture, fading toward the bottom */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(147,178,255,0.18) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, transparent, black 55%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 55%)",
          }}
        />
        {/* Soft wave near the bottom */}
        <svg
          className="absolute inset-x-0 bottom-0 h-40 w-full text-white/10"
          viewBox="0 0 480 160"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 120 C120 70 240 170 480 90"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M0 150 C140 110 260 190 480 120"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white/5 text-[#93b2ff] ring-1 ring-white/15">
            <ShieldLock className="h-10 w-10" />
          </span>
          <h1 className="mt-7 text-3xl font-bold leading-tight">
            Token Management
            <br />
            <span className="text-[#5b8cff]">System</span>
          </h1>
          <p className="mt-3 text-sm text-blue-100/70">Secure. Manage. Monitor.</p>
          <span className="mt-6 block h-0.5 w-10 rounded-full bg-[#5b8cff]" />
        </div>
      </aside>

      {/* Right sign-in pane */}
      <main className="flex flex-1 flex-col px-6 py-10 sm:px-10">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to access the Token Management System
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
        <footer className="pt-8 text-center text-xs text-slate-400">
          © {year} Token Management System. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
