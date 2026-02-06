"use client";

import { useState, useEffect } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { ID, Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Copy } from "lucide-react";

interface NewUser {
    name: string;
    key: string;
}

export default function AdminCreateUsers() {
    const { userMeta } = useAuth();
    // Use Array.from to generate UNIQUE objects, avoiding shared reference issues
    const [users, setUsers] = useState<NewUser[]>(Array.from({ length: 6 }, () => ({ name: "", key: "" })));
    const [loading, setLoading] = useState(false);

    // Fetch existing users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await databases.listDocuments(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.USERS_COLLECTION_ID,
                    [Query.limit(100)]
                );

                // Map existing users to the state format
                const existingUsers = response.documents.map((doc: any) => ({
                    name: doc.name,
                    key: doc.tripKey
                }));

                // Fill the rest with empty slots up to 6 (or more if existing > 6)
                const totalSlots = Math.max(existingUsers.length, 6);
                const mergedUsers = Array.from({ length: totalSlots }, (_, i) => {
                    if (i < existingUsers.length) return existingUsers[i];
                    return { name: "", key: "" };
                });

                setUsers(mergedUsers);
            } catch (error) {
                console.error("Failed to fetch users", error);
                toast.error("Failed to load existing users");
            }
        };

        fetchUsers();
    }, []);

    const generateKey = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleUpdateName = (index: number, name: string) => {
        const newUsers = [...users];
        // Ensure we preserve the key if it exists, or generate a new one
        const key = newUsers[index].key || generateKey();
        newUsers[index] = { name, key };
        setUsers(newUsers);
    };

    const handleSave = async () => {
        const validUsers = users.filter(u => u.name.trim() !== "");

        if (validUsers.length === 0) {
            toast.error("Please enter at least one name");
            return;
        }

        setLoading(true);
        try {
            const promises = validUsers.map(async u => {
                const payload = {
                    name: u.name,
                    tripKey: u.key,
                    userId: "placeholder-" + ID.unique(), // Unique placeholder to avoid unique constraint if userId is unique
                    role: "user",
                    createdBy: userMeta?.userId || "admin",
                };

                try {
                    await databases.createDocument(
                        APPWRITE_CONFIG.DATABASE_ID,
                        APPWRITE_CONFIG.USERS_COLLECTION_ID,
                        ID.unique(),
                        payload
                    );
                } catch (error: any) {
                    if (error.code === 409 || error.type === "document_already_exists") {
                        // User/Key already exists, treat as success (idempotent)
                        return;
                    }
                    throw error;
                }
            });
            await Promise.all(promises);
            toast.success("Users created!");
        } catch (error: any) {
            console.error("Batch Error:", error);
            toast.error("Failed to create users");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute adminOnly>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold">Trip Setup</h1>
                <p className="text-muted-foreground">Create accounts for 6 other travelers.</p>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {users.map((u, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <CardTitle>Traveler {i + 1}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Input
                                    placeholder="Name"
                                    value={u.name}
                                    onChange={(e) => handleUpdateName(i, e.target.value)}
                                />
                                {u.key && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 p-2 bg-muted rounded text-center font-mono text-lg tracking-widest">
                                            {u.key}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(u.key);
                                                toast.success("Key copied!");
                                            }}
                                            title="Copy Key"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Button size="lg" onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                    {loading ? "Saving..." : "Generate Keys & Save"}
                </Button>
            </div>
        </ProtectedRoute>
    );
}
