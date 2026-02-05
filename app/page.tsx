"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, userMeta, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userMeta) {
        if (userMeta.role === 'admin') {
          // Check if users created? Maybe always go to dashboard if setup done.
          // For now, simpler:
          router.push("/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        // User logged in but no meta -> needs to setup or join
        router.push("/setup");
      }
    }
  }, [user, userMeta, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
