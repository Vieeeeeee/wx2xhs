import type { Card } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

interface CardPreviewProps {
    card: Card
    forExport?: boolean
}

export function CardPreview({ card, forExport = false }: CardPreviewProps) {
    // 1. Pre-process text to support ==highlight== by converting to <mark>
    let processedText = card.text.replace(/==([^=]+)==/g, '<mark>$1</mark>')

    // 2. Convert single newlines to double newlines for proper paragraph breaks
    // ReactMarkdown treats \n\n as paragraph break (new <p> tag with margin)
    // but single \n with remark-breaks becomes <br> (no margin)
    // User wants visible paragraph spacing, so we convert all single \n to \n\n
    processedText = processedText.replace(/\n/g, '\n\n')

    // Custom renderer for ReactMarkdown to match our specific syntax requirement
    // For ==highlight== we might need a plugin or just custom regex replacement before passing to MD
    // But GFM and standard MD don't support ==.
    // Let's stick to standard MD for now, but handle == manually if needed?
    // User asked for "obsidian rendering mode". Obsidian supports ==highlight==.
    // react-markdown doesn't support highlight via == out of the box without remark-directive or custom plugin.
    // Quick fix: replace ==text== with <mark>text</mark> before passing to ReactMarkdown, 
    // allow html (rehype-raw) OR just use regex to wrap in a custom component? 
    // Simplest: Pre-process == to <mark> and enable rehype-raw? No, safety.
    // Let's verify if user used == in the example. Yes.
    // Actually, `remark-gfm` supports strikethrough ~~ but not ==.
    // Let's try to map == to ** (bold) or just keep it simple for now, 
    // OR create a simple regex parser for == if necessary later.
    // BETTER: Use `parseFormattedText` concept but specifically for == if MD doesn't catch it.
    // However, the `parseFormattedText` was doing exactly what we needed.
    // The user wants "render md format".
    // Let's use ReactMarkdown. For ==, we can pre-process it to <mark> and use `rehype-raw` IF we install it.
    // Unsafe? It's local input.
    // Alternative: Just trust standard MD for now. Bold/Italic work. == might show as ==.
    // Let's update text to replace `==` with `MARKER` then custom component? Too complex.
    // Let's stick to ReactMarkdown for structure.

    // WAIT. If I switch to ReactMarkdown, my custom classes in index.css for `strong`, `em` etc still apply? Yes.
    // But `class="card-text"` needs to be on the container.

    // Let's pre-process `==` to just be `**` for highlighting if we don't have a plugin, 
    // OR just use a simple regex replacer to wrap in <mark> and use `rehype-raw` is best match for Obsidian.
    // Checking package.json... I didn't install rehype-raw.
    // I will try to support == by replacing it with a supported syntax or just let it be text for now 
    // unless I install more packages.
    // Let's use `remark-gfm` for tables/etc if user pastes them.

    return (
        <div
            id={forExport ? `card-export-${card.id}` : undefined}
            className={forExport ? "card-preview" : "relative overflow-hidden rounded-lg shadow-lg bg-white"}
            style={forExport ? {} : { width: 1080 * 0.3, height: 1920 * 0.3 }}
        >
            <div
                className={forExport ? "" : "card-preview"} // Correct scaling container
                style={forExport ? {} : {
                    transform: `scale(0.3)`,
                    transformOrigin: 'top left',
                    width: '1080px',
                    height: '1920px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {/* Ensure card-text is nested inside card-preview for CSS to work */}
                <div className="card-text">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            // Ensure standard p tag usage
                        }}
                    >
                        {processedText}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    )
}


