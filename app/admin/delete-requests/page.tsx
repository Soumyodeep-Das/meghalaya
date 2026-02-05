"use client";

import { useEffect, useState } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { DeleteRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DeleteRequestsPage() {
    const { userMeta } = useAuth();
    const [requests, setRequests] = useState<DeleteRequest[]>([]);

    useEffect(() => {
        if (userMeta?.role !== 'admin') return;

        const fetchRequests = async () => {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.DELETE_REQUESTS_COLLECTION_ID,
                [Query.equal("approved", false)]
            );
            setRequests(response.documents as unknown as DeleteRequest[]);
        };
        fetchRequests();
    }, [userMeta]);

    const handleApprove = async (req: DeleteRequest) => {
        try {
            // Delete the expense
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                req.expenseId
            );
            // Mark request approved/deleted or just delete the request doc
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.DELETE_REQUESTS_COLLECTION_ID,
                req.$id
            );

            setRequests(requests.filter(r => r.$id !== req.$id));
            toast.success("Expense deleted successfully");
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.DELETE_REQUESTS_COLLECTION_ID,
                id
            );
            setRequests(requests.filter(r => r.$id !== id));
            toast.success("Request rejected");
        } catch (error) {
            toast.error("Failed to reject");
        }
    };



    return (
        <ProtectedRoute adminOnly>
            <div className="p-4 max-w-2xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold">Delete Requests</h1>
                {requests.length === 0 && <p className="text-muted-foreground">No pending requests.</p>}

                {requests.map(req => (
                    <Card key={req.$id}>
                        <CardHeader>
                            <CardTitle className="text-base">Request to delete Expense {req.expenseId}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleReject(req.$id)}>Reject</Button>
                            <Button variant="destructive" onClick={() => handleApprove(req)}>Approve & Delete</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ProtectedRoute>
    );
}
