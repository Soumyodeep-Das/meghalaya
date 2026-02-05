"use client";

import { useState, useEffect } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function TripKeyPage() {
    const [key, setKey] = useState("");
    const [loading, setLoading] = useState(false);
    const { user, userMeta, refreshAuth } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (userMeta) {
            router.push("/dashboard");
        }
    }, [userMeta, router]);

    if (userMeta) return null;

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Find the user slot with this key
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_COLLECTION_ID,
                [Query.equal("tripKey", key)]
            );

            if (response.documents.length === 0) {
                throw new Error("Invalid trip key.");
            }

            const doc = response.documents[0];

            if (doc.userId && !doc.userId.startsWith("placeholder")) {
                // If userId is real (doesn't start with placeholder), it's claimed
                throw new Error("This key has already been claimed.");
            }

            // Update the document with the real User ID
            await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_COLLECTION_ID,
                doc.$id,
                {
                    userId: user.$id
                }
            );

            await refreshAuth();
            toast.success("Successfully joined the trip!");
            router.push("/dashboard");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to join trip");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl">Enter Trip Key</CardTitle>
                        <CardDescription>Enter the unique key provided by the trip admin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoin} className="grid gap-4">
                            <div className="grid gap-2">
                                <Input
                                    id="key"
                                    type="text"
                                    placeholder="Trip Key (e.g. TRIP-123)"
                                    required
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading ? "Joining..." : "Join Trip"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
