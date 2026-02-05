"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getQueue, clearQueueItem } from "@/lib/indexedDB";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import toast from "react-hot-toast";

interface OfflineContextType {
    isOnline: boolean;
    syncPending: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [syncPending, setSyncPending] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            processQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const processQueue = async () => {
        setSyncPending(true);
        try {
            const queue = await getQueue();
            if (queue.length === 0) {
                setSyncPending(false);
                return;
            }

            toast.loading("Syncing offline changes...", { id: "sync" });

            for (const item of queue) {
                try {
                    if (item.action === 'create') {
                        // Create document in Appwrite
                        // Remove temp ID fields if any that shouldn't be sent
                        const { $id, ...payload } = item.data;

                        try {
                            await databases.createDocument(
                                APPWRITE_CONFIG.DATABASE_ID,
                                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                                item.tempId, // Use the client-generated ID to ensure idempotency
                                payload
                            );
                        } catch (createError: any) {
                            // If conflict (409), it means it was already synced but we didn't ack it locally
                            if (createError.code === 409 || createError.type === "document_already_exists") {
                                console.log("Item already synced, removing from queue:", item.tempId);
                                // Treat as success to remove from queue
                            } else {
                                throw createError;
                            }
                        }
                    } else if (item.action === 'delete') {
                        // Handle delete requests (admin direct delete or user request)
                        // item.data should contain necessary delete info
                    }

                    await clearQueueItem(item.id!);
                } catch (err) {
                    console.error("Sync failed for item", item, err);
                }
            }
            toast.success("Sync complete!", { id: "sync" });
        } catch (error) {
            console.error("Queue processing failed", error);
            toast.error("Sync failed", { id: "sync" });
        } finally {
            setSyncPending(false);
        }
    };

    return (
        <OfflineContext.Provider value={{ isOnline, syncPending }}>
            {children}
        </OfflineContext.Provider>
    );
}

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error("useOffline must be used within an OfflineProvider");
    }
    return context;
};
