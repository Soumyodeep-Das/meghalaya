"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";
import toast from "react-hot-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link"; // Ideally we should have a sidebar or nav

export default function CategoriesAdminPage() {
    const { userMeta, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial default categories
    const DEFAULT_CATEGORIES = ["food", "transport", "hotel", "misc"];

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const doc = await databases.getDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                APPWRITE_CONFIG.SETTINGS_DOC_ID
            );
            // Assuming categories are stored as a JSON string or comma-separated string in 'repaymentStatus' or 'purpose' field 
            // since we are reusing the Expense schema:
            // Let's use 'repaymentStatus' to store the JSON array of categories.
            // AND 'category' = 'SETTINGS' to identify it easily.

            if (doc.repaymentStatus) {
                try {
                    const parsed = JSON.parse(doc.repaymentStatus);
                    if (Array.isArray(parsed)) {
                        setCategories(parsed);
                    } else {
                        setCategories(DEFAULT_CATEGORIES);
                    }
                } catch (e) {
                    setCategories(DEFAULT_CATEGORIES);
                }
            }
        } catch (error: any) {
            if (error.code === 404) {
                // Document doesn't exist yet, we will create it on first save
                setCategories(DEFAULT_CATEGORIES);
            } else {
                console.error("Failed to fetch settings", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        const formatted = newCategory.trim().toLowerCase();
        if (categories.includes(formatted)) {
            toast.error("Category already exists");
            return;
        }
        setCategories([...categories, formatted]);
        setNewCategory("");
    };

    const handleDeleteCategory = (cat: string) => {
        setCategories(categories.filter(c => c !== cat));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = {
                category: 'SETTINGS', // Flag
                amount: 0,
                purpose: 'App Settings - Categories',
                splitMode: 'equal',
                splitAmong: [],
                paymentMode: 'online',
                repaymentStatus: JSON.stringify(categories), // Storing array here
                timestamp: Date.now(),
                createdBy: userMeta?.$id || 'admin',
                spentBy: userMeta?.$id || 'admin',
                receipt: null
            };

            try {
                // Try to update existing first
                await databases.updateDocument(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                    APPWRITE_CONFIG.SETTINGS_DOC_ID,
                    data
                );
            } catch (error: any) {
                if (error.code === 404) {
                    // Create if not exists
                    await databases.createDocument(
                        APPWRITE_CONFIG.DATABASE_ID,
                        APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                        APPWRITE_CONFIG.SETTINGS_DOC_ID,
                        data,
                        [
                            Permission.read(Role.any()), // Public read so all users can see categories
                            Permission.write(Role.users()), // Allow any auth user to update (protected by UI check)
                            Permission.update(Role.users()),
                        ]
                    );
                } else {
                    throw error;
                }
            }
            toast.success("Categories saved!");
        } catch (error) {
            console.error("Failed to save categories", error);
            toast.error("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) return <div className="p-8">Loading...</div>;

    if (userMeta?.role !== 'admin') {
        return <div className="p-8 text-red-500">Access Denied. Admins only.</div>;
    }

    return (
        <ProtectedRoute>
            <div className="p-4 max-w-2xl mx-auto pb-20 space-y-6">
                <h1 className="text-2xl font-bold">Manage Categories</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense Categories</CardTitle>
                        <CardDescription>Add or remove categories available for expenses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="New Category (e.g. Snacks)"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            />
                            <Button onClick={handleAddCategory}><Plus className="w-4 h-4 mr-2" /> Add</Button>
                        </div>

                        <div className="border rounded-md divide-y">
                            {categories.map((cat) => (
                                <div key={cat} className="flex justify-between items-center p-3">
                                    <span className="capitalize">{cat}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground text-sm">No categories defined.</div>
                            )}
                        </div>

                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
