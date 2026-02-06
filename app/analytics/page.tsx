"use client";

import { useEffect, useState } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Expense } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AnalyticsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const [userMap, setUserMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadData = async () => {
            // Parallel fetch
            const [expenseParams, userResponse] = await Promise.all([
                databases.listDocuments(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                    [Query.limit(100)]
                ),
                databases.listDocuments(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.USERS_COLLECTION_ID
                )
            ]);

            setExpenses(expenseParams.documents as unknown as Expense[]);

            const map: Record<string, string> = {};
            userResponse.documents.forEach((doc: any) => {
                map[doc.$id] = doc.name;
                // Also map userId (Auth ID) for backward compatibility with older expenses
                if (doc.userId) {
                    map[doc.userId] = doc.name;
                }
            });
            setUserMap(map);
        };

        try {
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Category Breakdown
    const categoryData = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(categoryData).map(key => ({
        name: key,
        value: categoryData[key]
    }));

    const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28'];

    // Per Person Breakdown (Spent By)
    const spenderData = expenses.reduce((acc, curr) => {
        acc[curr.spentBy] = (acc[curr.spentBy] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <ProtectedRoute>
            <div className="p-4 max-w-2xl mx-auto pb-20 space-y-6">
                <h1 className="text-2xl font-bold">Trip Analytics</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Trip Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">₹{totalSpent.toFixed(2)}</div>
                    </CardContent>
                </Card>

                {/* ... pie chart ... */}

                <Card>
                    <CardHeader>
                        <CardTitle>Spender Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {Object.entries(spenderData).map(([userId, amount]) => (
                                <li key={userId} className="flex justify-between border-b pb-2">
                                    <span>{userMap[userId] || "Unknown"}</span>
                                    <span className="font-bold">₹{amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
