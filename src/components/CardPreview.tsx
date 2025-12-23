import type { Card } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

interface Typography {
    fontSize: number
    lineHeight: number
    paragraphSpacing: number
    letterSpacing?: number
}

export type BackgroundStyle = 'classic' | 'grid' | 'paper' | 'grain'

interface CardPreviewProps {
    card: Card
    images?: Map<string, string>
    typography?: Typography
    backgroundStyle?: BackgroundStyle
    forExport?: boolean
    displayScale?: number
}

function escapeAngleBrackets(text: string): string {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function preprocessCustomMarkup(text: string): string {
    const safe = escapeAngleBrackets(text)
    const withHighlight = safe.replace(/==([\s\S]+?)==/g, '<mark>$1</mark>')
    return withHighlight.replace(/__([\s\S]+?)__/g, '<u>$1</u>')
}

function parseContentSegments(text: string): Array<{ type: 'text' | 'image'; content: string }> {
    const segments: Array<{ type: 'text' | 'image'; content: string }> = []
    const regex = /\[IMG:([a-zA-Z0-9_-]+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
        }
        segments.push({ type: 'image', content: match[1] })
        lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return segments
}

export function CardPreview({ card, images, typography, backgroundStyle = 'classic', forExport = false, displayScale }: CardPreviewProps) {
    const fontSize = typography?.fontSize ?? 32
    const lineHeight = typography?.lineHeight ?? 1.6
    const paragraphSpacing = typography?.paragraphSpacing ?? 1.2
    const letterSpacing = typography?.letterSpacing ?? 0.05

    const segments = parseContentSegments(card.text)

    const textStyles: React.CSSProperties & { ['--paragraph-spacing']?: string } = {
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        letterSpacing: `${letterSpacing}em`,
        ['--paragraph-spacing']: `${paragraphSpacing}em`,
    }

    const imgStyles: React.CSSProperties = {
        width: '100%',
        height: 'auto',
        display: 'block',
        margin: '0.8em auto',
        borderRadius: '8px',
        maxHeight: '520px',
        objectFit: 'contain' as const,
    }

    const getExportBackgroundStyle = (): React.CSSProperties => {
        switch (backgroundStyle) {
            case 'grid':
                return {
                    background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
                    backgroundImage: `
                        linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)
                    `,
                    backgroundSize: '28px 28px'
                }
            case 'paper':
                return {
                    background: '#f5f4f2'
                }
            case 'grain':
                return {
                    background: '#e9e9e9'
                }
            default:
                return {
                    background: 'linear-gradient(180deg, #fdfcfa 0%, #f9f7f4 100%)'
                }
        }
    }

    const renderContent = () => (
        <div className="card-text" style={textStyles}>
            {segments.map((segment, index) => {
                if (segment.type === 'image') {
                    const base64 = images?.get(segment.content)
                    if (base64) {
                        return <img key={index} src={base64} alt="image" style={imgStyles} />
                    }
                    return <span key={index}>[IMG:{segment.content}]</span>
                }
                const textWithBreaks = preprocessCustomMarkup(segment.content)
                return (
                    <ReactMarkdown
                        key={index}
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw]}
                    >
                        {textWithBreaks}
                    </ReactMarkdown>
                )
            })}
        </div>
    )

    if (forExport) {
        return (
            <div
                id={`card-export-${card.id}`}
                className={`card-preview bg-${backgroundStyle}`}
                style={{
                    ...getExportBackgroundStyle(),
                    width: '1080px',
                    height: '1440px',
                }}
            >
                {renderContent()}
            </div>
        )
    }

    const scale = displayScale ?? 0.3
    return (
        <div
            className="relative overflow-hidden rounded-lg shadow-lg bg-white"
            style={{ width: 1080 * scale, height: 1440 * scale }}
        >
            <div
                className={`card-preview bg-${backgroundStyle}`}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: '1080px',
                    height: '1440px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {renderContent()}
            </div>
        </div>
    )
}
