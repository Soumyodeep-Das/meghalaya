"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { Button } from "@/components/ui/button";
import { LogOut, Home, BarChart3, WifiOff, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const { logout, userMeta } = useAuth();
    const { isOnline } = useOffline();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-background border-b sticky top-0 z-50 shadow-sm">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">

                {/* Left: Logo/Home */}
                {/* Left: Logo/Home */}
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="font-bold text-lg tracking-tight">
                        Meghalaya
                    </Link>
                    {!isOnline && (
                        <div className="flex items-center gap-1 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-full">
                            <WifiOff className="h-3 w-3" />
                            <span>Offline</span>
                        </div>
                    )}
                </div>

                {/* Middle: User Info (Name & Trip Key) */}
                {userMeta && (
                    <div className="flex flex-col items-center leading-tight mx-2">
                        <span className="text-xs sm:text-sm font-semibold truncate max-w-[100px] sm:max-w-[150px]">{userMeta.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded">
                            {userMeta.tripKey}
                        </span>
                    </div>
                )}

                {/* Right: Nav Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className={cn(isActive("/dashboard") && "bg-muted")}>
                            <Home className="h-5 w-5" />
                        </Button>
                    </Link>

                    <Link href="/analytics">
                        <Button variant="ghost" size="icon" className={cn(isActive("/analytics") && "bg-muted")}>
                            <BarChart3 className="h-5 w-5" />
                        </Button>
                    </Link>

                    {userMeta?.role === 'admin' && (
                        <Link href="/admin/create-users">
                            <Button variant="ghost" size="icon" className={cn(isActive("/admin/create-users") && "bg-muted")}>
                                <Settings className="h-5 w-5" />
                            </Button>
                        </Link>
                    )}

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
                        <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
            </div>
        </nav>
    );
}
