"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

export function LogoutButton({ kind, to }: { kind: "admin" | "client"; to: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        await fetch(`/api/auth/logout?kind=${kind}`, { method: "POST" });
        router.push(to);
        router.refresh();
      }}
    >
      Uitloggen
    </Button>
  );
}
