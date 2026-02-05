"use client";

import { useState } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { ID } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";

interface NewUser {
    name: string;
    key: string;
}

export default function AdminCreateUsers() {
    const { userMeta } = useAuth();
    const [users, setUsers] = useState<NewUser[]>(Array(6).fill({ name: "", key: "" }));
    const [loading, setLoading] = useState(false);

    // Only Admin


    const generateKey = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleUpdateName = (index: number, name: string) => {
        const newUsers = [...users];
        newUsers[index] = { ...newUsers[index], name, key: newUsers[index].key || generateKey() };
        setUsers(newUsers);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const promises = users.filter(u => u.name).map(async u => {
                try {
                    await databases.createDocument(
                        APPWRITE_CONFIG.DATABASE_ID,
                        APPWRITE_CONFIG.USERS_COLLECTION_ID,
                        ID.unique(),
                        {
                            name: u.name,
                            tripKey: u.key,
                            userId: "placeholder",
                            role: "user",
                            createdBy: userMeta?.userId || "admin",
                        }
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
            console.error(error);
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
                                    <div className="p-2 bg-muted rounded text-center font-mono text-lg tracking-widest">
                                        {u.key}
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
