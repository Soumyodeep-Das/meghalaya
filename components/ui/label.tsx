"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Needs @radix-ui/react-label but we will just make a simple one to avoid install chaos if possible,
// but the user's prompt implies we can use shadcn.
// I'll stick to basic HTML mainly to avoid heavy radix deps if I didn't install them.
// Wait, I did NOT install @radix-ui/* except slot in my head? I didn't install slot either.
// Ah, `npm install @radix-ui/react-slot` is standard for shadcn.
// I will rewrite Button to NOT use slot if I didn't install it, OR I will install it.
// I'll assume standard HTML for Label for simplicity unless strictly needed.

const labelVariants = cva(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(labelVariants(), className)}
        {...props}
    />
))
Label.displayName = "Label"

export { Label }
