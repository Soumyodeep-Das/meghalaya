import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string | null;
    fallback: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, fallback, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary items-center justify-center",
                    className
                )}
                {...props}
            >
                {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={src}
                        alt="Avatar"
                        className="aspect-square h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-sm font-medium uppercase text-secondary-foreground">{fallback}</span>
                )}
            </div>
        )
    }
)
Avatar.displayName = "Avatar"

export { Avatar }
