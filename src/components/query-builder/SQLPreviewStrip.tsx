import { useState } from 'react';
import { ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SQLPreviewStripProps {
    sql: string;
    isExpanded: boolean;
    onToggle: () => void;
}

export default function SQLPreviewStrip({
    sql,
    isExpanded,
    onToggle,
}: SQLPreviewStripProps) {
    console.log(sql)
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy SQL');
        }
    };

    return (
        <div
            className={`
        border-t border-border/20 bg-background/95 backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'h-[200px]' : 'h-[48px]'}
      `}
        >
            {/* Header Bar */}
            <div className="h-[48px] px-6 flex items-center justify-between border-b border-border/20">
                <h3 className="text-sm font-semibold">Generated SQL</h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="text-xs h-7"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy
                            </>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggle}
                        className="text-xs h-7"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronDown className="h-4 w-4 mr-1.5" />
                                Collapse
                            </>
                        ) : (
                            <>
                                <ChevronUp className="h-4 w-4 mr-1.5" />
                                Expand
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* SQL Content (only visible when expanded) */}
            {isExpanded && (
                <div className="h-[calc(100%-48px)] overflow-auto px-6 py-3">
                    <pre className="text-xs font-mono bg-muted/30 p-3 rounded-md border border-border/20 overflow-x-auto">
                        {sql || '-- No query generated yet'}
                    </pre>
                </div>
            )}
        </div>
    );
}
