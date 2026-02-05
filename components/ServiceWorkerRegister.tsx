"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator && window.location.protocol === 'https:') {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => console.log("SW registered scope:", reg.scope))
                .catch((err) => console.log("SW registration failed:", err));
        }
    }, []);

    return null;
}
