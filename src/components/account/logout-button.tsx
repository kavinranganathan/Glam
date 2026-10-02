"use client";

import * as React from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";

/** Logout row: confirms in a modal, then submits a real form POST to /auth/signout (PRD §8.10). */
export function LogoutButton() {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface focus-visible:bg-surface"
      >
        <span className="rounded-full bg-error-soft p-2 text-error">
          <LogOut className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-error">Logout</span>
          <span className="block text-xs text-text-tertiary">Your bag is saved to your account</span>
        </span>
        <ChevronRight className="h-5 w-5 text-text-tertiary" aria-hidden />
      </button>
      <form ref={formRef} method="post" action="/auth/signout" className="hidden" />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Log out of GLAM?"
        description="Your bag and wishlist are synced to your account, so nothing is lost."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={() => formRef.current?.submit()}>
              Log out
            </Button>
          </>
        }
      />
    </>
  );
}
