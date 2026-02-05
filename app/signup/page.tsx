"use client";

import { useState } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ID } from "appwrite";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { refreshAuth } = useAuth();
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await account.create(ID.unique(), email, password, name);
            // Auto login after signup
            await account.createEmailPasswordSession(email, password);
            await refreshAuth();
            toast.success("Account created!");
            router.push("/");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Sign Up</CardTitle>
                    <CardDescription>Create a new account to join the trip.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="grid gap-4">
                        <div className="grid gap-2">
                            <Input
                                id="name"
                                type="text"
                                placeholder="Full Name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="password"
                                type="password"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Creating account..." : "Sign Up"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center w-full">
                        Already have an account?{" "}
                        <Link href="/login" className="underline">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
