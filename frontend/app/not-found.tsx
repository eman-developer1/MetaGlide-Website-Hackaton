import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)] transition-colors">
      <div className="max-w-md w-full text-center space-y-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 sm:p-10 shadow-xl">
        {/* Brand Logo Chip */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-2 shadow-md border border-[var(--border)] mx-auto">
          <Image
            src="/logo.png"
            alt="MetaGlide Marketing"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>

        {/* 404 Status */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            404 Error: Resource Not Found
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--navy)] dark:text-white">
            Page Not Located
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            The requested destination does not exist, was moved, or requires elevated authorization in MetaGlide HCM Lite.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] text-white text-xs sm:text-sm font-bold hover:opacity-95 transition shadow-md shadow-[#0A66C2]/20 inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--border)] text-xs sm:text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
          © MetaGlide Marketing — Effortless Digital Growth
        </p>
      </div>
    </div>
  );
}
