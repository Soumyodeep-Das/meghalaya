"use client";

import { useState, useEffect } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { ID, Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Copy, UserPlus, Trash2, UserCheck, UserX } from "lucide-react";

interface NewUser {
    id?: string; // Appwrite Document ID if existing
    name: string;
    key: string;
    status: "active" | "left";
}

export default function AdminCreateUsers() {
    const { userMeta } = useAuth();
    const [users, setUsers] = useState<NewUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                    id: doc.$id,
                    name: doc.name,
                    key: doc.tripKey,
                    status: doc.status || "active" // Default to active if missing
                }));

                if (existingUsers.length === 0) {
                    setUsers([{ name: "", key: "", status: "active" }]);
                } else {
                    setUsers(existingUsers);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
                toast.error("Failed to load existing users");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const generateKey = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleUpdateName = (index: number, name: string) => {
        const newUsers = [...users];
        const key = newUsers[index].key || generateKey();
        newUsers[index] = { ...newUsers[index], name, key };
        setUsers(newUsers);
    };

    const handleAddUser = () => {
        setUsers([...users, { name: "", key: "", status: "active" }]);
    };

    const handleToggleStatus = (index: number) => {
        const newUsers = [...users];
        const user = newUsers[index];
        // Toggle status
        user.status = user.status === "active" ? "left" : "active";
        setUsers(newUsers);
    };

    const handleRemoveNewUser = (index: number) => {
        const newUsers = [...users];
        newUsers.splice(index, 1);
        setUsers(newUsers);
    };

    const handleSave = async () => {
        const validUsers = users.filter(u => u.name.trim() !== "");

        if (validUsers.length === 0) {
            toast.error("Please enter at least one name");
            return;
        }

        setSaving(true);
        try {
            const promises = validUsers.map(async u => {
                const payload = {
                    name: u.name,
                    tripKey: u.key,
                    status: u.status,
                    // Only set these for new users
                    ...(u.id ? {} : {
                        userId: "placeholder-" + ID.unique(),
                        role: "user",
                        createdBy: userMeta?.userId || "admin",
                    })
                };

                try {
                    if (u.id) {
                        // Update existing
                        await databases.updateDocument(
                            APPWRITE_CONFIG.DATABASE_ID,
                            APPWRITE_CONFIG.USERS_COLLECTION_ID,
                            u.id,
                            {
                                name: u.name,
                                status: u.status
                            }
                        );
                    } else {
                        // Create new
                        await databases.createDocument(
                            APPWRITE_CONFIG.DATABASE_ID,
                            APPWRITE_CONFIG.USERS_COLLECTION_ID,
                            ID.unique(),
                            payload
                        );
                    }
                } catch (error: any) {
                    if (error.code === 409 || error.type === "document_already_exists") {
                        // Ignore conflicts for now
                        return;
                    }
                    throw error;
                }
            });
            await Promise.all(promises);
            toast.success("Users updated!");

            // Refresh logic could be better, but for now reload to get fresh IDs for new users
            setTimeout(() => window.location.reload(), 1000);

        } catch (error: any) {
            console.error("Batch Error:", error);
            toast.error("Failed to save users");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ProtectedRoute adminOnly>
            <div className="p-6 max-w-5xl mx-auto space-y-8 pb-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Trip Members</h1>
                        <p className="text-muted-foreground">Manage who is going on the trip.</p>
                    </div>
                    <Button onClick={handleAddUser} className="gap-2">
                        <UserPlus className="h-4 w-4" /> Add Traveler
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {users.map((u, i) => {
                            const isLeft = u.status === "left";
                            return (
                                <Card key={i} className={`transition-all ${isLeft ? "border-red-200 bg-red-50/50 opacity-75" : "border-green-200 bg-green-50/10"}`}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Traveler {i + 1}
                                        </CardTitle>
                                        <div className="flex gap-1">
                                            {/* Status Toggle */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-8 px-2 text-xs gap-1 ${isLeft ? "text-red-600 hover:text-red-700 hover:bg-red-100" : "text-green-600 hover:text-green-700 hover:bg-green-100"}`}
                                                onClick={() => handleToggleStatus(i)}
                                                title={isLeft ? "Mark as Going" : "Mark as Left"}
                                            >
                                                {isLeft ? (
                                                    <>
                                                        <UserX className="h-4 w-4" /> Left
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="h-4 w-4" /> Going
                                                    </>
                                                )}
                                            </Button>

                                            {/* Remove Button (Only for new unsaved users) */}
                                            {!u.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveNewUser(i)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <Input
                                            placeholder="Name"
                                            value={u.name}
                                            onChange={(e) => handleUpdateName(i, e.target.value)}
                                            className={isLeft ? "text-muted-foreground line-through" : ""}
                                        />
                                        {u.key && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 p-2 bg-muted rounded text-center font-mono text-lg tracking-widest truncate">
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
                            );
                        })}
                    </div>
                )}

                <div className="fixed bottom-0 left-0 w-full p-4 bg-background border-t flex justify-center md:justify-end md:px-10 z-10">
                    <Button size="lg" onClick={handleSave} disabled={saving || loading} className="w-full md:w-auto shadow-lg">
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </ProtectedRoute>
    );
}
