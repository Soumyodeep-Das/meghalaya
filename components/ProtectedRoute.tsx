"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const { user, userMeta, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (!userMeta && pathname !== "/setup" && pathname !== "/trip-key") {
                // If user is logged in but has no meta strings attached (no profile/trip), send to setup
                // Allow /trip-key because they might be trying to join
                router.push("/setup");
            } else if (adminOnly && userMeta && userMeta.role !== 'admin') {
                router.push("/dashboard"); // Redirect non-admins to dashboard
            }
        }
    }, [user, userMeta, loading, router, adminOnly, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;
    if (adminOnly && userMeta?.role !== 'admin') return null;

    return (
        <>
            <Navbar />
            {children}
        </>
    );
}
