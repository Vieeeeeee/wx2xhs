import type { Card } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

interface Typography {
    fontSize: number
    lineHeight: number
    paragraphSpacing: number
}

interface CardPreviewProps {
    card: Card
    images?: Map<string, string>
    typography?: Typography
    forExport?: boolean
}

// Parse content into segments: { type: 'text', content: string } | { type: 'image', id: string }
function parseContentSegments(text: string): Array<{ type: 'text' | 'image'; content: string }> {
    const segments: Array<{ type: 'text' | 'image'; content: string }> = []
    const regex = /\[IMG:([a-zA-Z0-9_-]+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
        }
        // Add the image
        segments.push({ type: 'image', content: match[1] })
        lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return segments
}

export function CardPreview({ card, images, typography, forExport = false }: CardPreviewProps) {
    const fontSize = typography?.fontSize ?? 44
    const lineHeight = typography?.lineHeight ?? 1.7
    const paragraphSpacing = typography?.paragraphSpacing ?? 1.2

    // Pre-process text for ==highlight==
    const processedText = card.text.replace(/==([^=]+)==/g, '<mark>$1</mark>')

    // Parse into segments
    const segments = parseContentSegments(processedText)

    const textStyles = {
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
    } as React.CSSProperties

    const imgStyles: React.CSSProperties = {
        width: '100%',
        height: 'auto',
        display: 'block',
        margin: '0.8em auto',
        borderRadius: '8px'
    }

    return (
        <div
            id={forExport ? `card-export-${card.id}` : undefined}
            className={forExport ? "card-preview" : "relative overflow-hidden rounded-lg shadow-lg bg-white"}
            style={forExport ? {} : { width: 1080 * 0.3, height: 1920 * 0.3 }}
        >
            <div
                className={forExport ? "" : "card-preview"}
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
                <div className="card-text" style={textStyles}>
                    {segments.map((segment, index) => {
                        if (segment.type === 'image') {
                            const base64 = images?.get(segment.content)
                            if (base64) {
                                return <img key={index} src={base64} alt="image" style={imgStyles} />
                            }
                            return <span key={index}>[IMG:{segment.content}]</span>
                        }
                        // Text segment: process through ReactMarkdown
                        const textWithBreaks = segment.content.replace(/\n/g, '\n\n')
                        return (
                            <ReactMarkdown
                                key={index}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                    p: ({ children }) => (
                                        <p style={{ marginBottom: `${paragraphSpacing}em` }}>{children}</p>
                                    )
                                }}
                            >
                                {textWithBreaks}
                            </ReactMarkdown>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}





