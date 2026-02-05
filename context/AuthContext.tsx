"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Models, Query } from "appwrite";
import { UserMeta } from "@/types";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    userMeta: UserMeta | null;
    loading: boolean;
    login: () => void;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkSession = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);

            if (currentUser) {
                try {
                    const response = await databases.listDocuments(
                        APPWRITE_CONFIG.DATABASE_ID,
                        APPWRITE_CONFIG.USERS_COLLECTION_ID,
                        [Query.equal("userId", currentUser.$id)]
                    );
                    if (response.documents.length > 0) {
                        setUserMeta(response.documents[0] as unknown as UserMeta);
                    } else {
                        setUserMeta(null);
                    }
                } catch (metaError) {
                    console.error("Error fetching user meta:", metaError);
                    setUserMeta(null);
                }
            }
        } catch (error) {
            setUser(null);
            setUserMeta(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const logout = async () => {
        await account.deleteSession("current");
        setUser(null);
        setUserMeta(null);
        router.push("/login");
    };

    const login = () => {
        router.push("/login");
    };

    const refreshAuth = async () => {
        setLoading(true);
        await checkSession();
    };

    return (
        <AuthContext.Provider value={{ user, userMeta, loading, login, logout, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
