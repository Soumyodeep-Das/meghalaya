"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

export default function SetupPage() {
    const { user, refreshAuth } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"select" | "create">("select");

    const handleCreateTrip = async () => {
        if (!name.trim()) return toast.error("Please enter your name");
        if (!user) return;

        setLoading(true);
        try {
            // 1. Check if user already has a meta doc (Idempotency check)
            const existing = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_COLLECTION_ID,
                [Query.equal("userId", user.$id)]
            );

            if (existing.documents.length > 0) {
                // User already exists, just redirect
                toast.success("Profile already exists! Redirecting...");
                await refreshAuth();
                router.push("/admin/create-users");
                return;
            }

            // 2. Create Admin User Meta
            try {
                await databases.createDocument(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.USERS_COLLECTION_ID,
                    ID.unique(),
                    {
                        userId: user.$id,
                        name: name,
                        role: "admin",
                        tripKey: "ADMIN-" + user.$id.substring(0, 5).toUpperCase(), // Placeholder key for admin themselves
                        createdBy: "self", // Admin created themselves
                    }
                );
            } catch (createError: any) {
                // If conflict (409), it means it was created by a race condition or previous partial success
                if (createError.code === 409 || createError.type === "document_already_exists") {
                    toast.success("Profile recovered! Redirecting...");
                    await refreshAuth();
                    router.push("/admin/create-users");
                    return;
                }
                throw createError; // Re-throw other errors
            }

            await refreshAuth();
            toast.success("Trip Created! Now add your friends.");
            router.push("/admin/create-users");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create trip");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
                <div className="max-w-3xl w-full grid gap-6 md:grid-cols-2">

                    {/* Mode Selection */}
                    {mode === "select" && (
                        <>
                            <Card className="cursor-pointer hover:border-primary transition-all" onClick={() => setMode("create")}>
                                <CardHeader>
                                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-primary">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Create New Trip</CardTitle>
                                    <CardDescription>
                                        I am the Trip Organizer. I will add other members.
                                    </CardDescription>
                                </CardHeader>
                            </Card>

                            <Link href="/trip-key" className="block">
                                <Card className="cursor-pointer hover:border-primary transition-all h-full">
                                    <CardHeader>
                                        <div className="bg-secondary w-12 h-12 rounded-full flex items-center justify-center mb-4 text-secondary-foreground">
                                            <ArrowRight className="h-6 w-6" />
                                        </div>
                                        <CardTitle>Join Existing Trip</CardTitle>
                                        <CardDescription>
                                            I have a Trip Key from my friend.
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </>
                    )}

                    {/* Create Form */}
                    {mode === "create" && (
                        <Card className="md:col-span-2 max-w-md mx-auto w-full">
                            <CardHeader>
                                <CardTitle>Setup Your Profile</CardTitle>
                                <CardDescription>Enter your name to start the trip.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Your Name (e.g. John)"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setMode("select")}>Back</Button>
                                    <Button className="flex-1" onClick={handleCreateTrip} disabled={loading}>
                                        {loading ? "Creating..." : "Continue"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    );
}
