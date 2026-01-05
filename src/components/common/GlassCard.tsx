import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ComponentPropsWithoutRef } from 'react';

interface GlassCardProps extends ComponentPropsWithoutRef<typeof Card> {
    blur?: boolean;
}

export default function GlassCard({
    children,
    className,
    blur = true,
    ...props
}: GlassCardProps) {
    return (
        <Card
            className={cn(
                'border-border/20',
                blur && 'backdrop-blur-md bg-background/80',
                className
            )}
            {...props}
        >
            {children}
        </Card>
    );
}
