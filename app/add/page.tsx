"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { databases, APPWRITE_CONFIG, storage } from "@/lib/appwrite";
import { addToQueue } from "@/lib/indexedDB";
import { ID } from "appwrite";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AddExpensePage() {
    const { userMeta } = useAuth();
    const { isOnline } = useOffline();
    const router = useRouter();

    const [amount, setAmount] = useState("");
    const [purpose, setPurpose] = useState("");
    const [category, setCategory] = useState("food");
    const [splitMode, setSplitMode] = useState("equal");
    const [splitAmong, setSplitAmong] = useState<string[]>([]);
    const [spentBy, setSpentBy] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userMeta) {
            setSpentBy(userMeta.$id); // Default to self (using immutable Doc ID)
            fetchTripUsers();
        }
    }, [userMeta]);

    const fetchTripUsers = async () => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_COLLECTION_ID
            );
            setUsers(response.documents);
            // Default split among everyone (using immutable Doc IDs)
            setSplitAmong(response.documents.map((u: any) => u.$id));
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleCheckboxChange = (userId: string, checked: boolean) => {
        setSplitAmong(prev => {
            if (checked) {
                return [...prev, userId];
            } else {
                return prev.filter(id => id !== userId);
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for Custom Split
        if (splitMode === 'custom' && splitAmong.length === 0) {
            toast.error("Please select at least one person to split among");
            return;
        }

        setLoading(true);

        const expenseData = {
            createdBy: userMeta?.$id || "unknown", // Use Doc ID
            spentBy: spentBy || userMeta?.$id, // Use Doc ID
            amount: parseFloat(amount),
            purpose,
            category,
            splitMode,
            splitAmong: splitMode === 'equal' ? [] : splitAmong,
            receipt: null,
            timestamp: Date.now(),
        };

        try {
            if (isOnline) {
                await databases.createDocument(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                    ID.unique(),
                    expenseData
                );
                toast.success("Expense added!");
            } else {
                await addToQueue({
                    tempId: ID.unique(),
                    data: expenseData,
                    action: 'create',
                    timestamp: Date.now()
                });
                toast.success("Saved offline. Will sync when online.");
            }
            router.push("/dashboard");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to add expense");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="flex bg-muted/20 min-h-screen w-full items-center justify-center p-4">
                <Card className="w-full max-w-lg my-8">
                    <CardHeader>
                        <CardTitle>Add New Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div className="space-y-2">
                                <Label>Who Paid?</Label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={spentBy}
                                    onChange={(e) => setSpentBy(e.target.value)}
                                >
                                    {users.map(u => (
                                        <option key={u.$id} value={u.$id}>
                                            {u.name} {u.userId === userMeta?.userId ? "(You)" : ""}
                                        </option>
                                    ))}
                                    {users.length === 0 && <option value={userMeta?.$id || ""}>Loading users...</option>}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="₹0.00"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="purpose">Purpose</Label>
                                <Input
                                    id="purpose"
                                    placeholder="Dinner, Fuel, etc."
                                    required
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="food">Food</option>
                                    <option value="fuel">Fuel</option>
                                    <option value="hotel">Hotel</option>
                                    <option value="misc">Misc</option>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Split Mode</Label>
                                <Select value={splitMode} onChange={(e) => setSplitMode(e.target.value)}>
                                    <option value="equal">Split Equally (All)</option>
                                    <option value="custom">Select Members</option>
                                </Select>
                            </div>

                            {splitMode === 'custom' && (
                                <div className="space-y-2 border p-3 rounded-md bg-muted/50">
                                    <Label className="mb-2 block">Select Involved Members:</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {users.map(u => (
                                            <div key={u.$id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`user-${u.$id}`}
                                                    checked={splitAmong.includes(u.$id)}
                                                    onCheckedChange={(checked) => handleCheckboxChange(u.$id, checked as boolean)}
                                                />
                                                <Label htmlFor={`user-${u.$id}`} className="cursor-pointer text-sm font-normal">
                                                    {u.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading ? "Saving..." : (isOnline ? "Add Expense" : "Save Offline")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
