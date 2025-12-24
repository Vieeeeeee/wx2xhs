import { useState, useRef, useCallback } from 'react'
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
    imageSizes?: Map<string, number>
    onImageResize?: (id: string, widthPercent: number) => void
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

interface ResizableImageProps {
    src: string
    imageId: string
    widthPercent: number
    onResize?: (id: string, widthPercent: number) => void
    forExport?: boolean
    displayScale?: number
}

function ResizableImage({ src, imageId, widthPercent, onResize, forExport, displayScale }: ResizableImageProps) {
    const [isResizing, setIsResizing] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const startXRef = useRef(0)
    const startWidthRef = useRef(0)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        startXRef.current = e.clientX
        startWidthRef.current = widthPercent

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const scale = displayScale ?? 1
            if (scale <= 0) return
            const containerWidth = 880 // Card content width (1080 - 200 padding)
            const deltaX = (moveEvent.clientX - startXRef.current) / scale
            const deltaPercent = (deltaX / containerWidth) * 100
            const newWidth = Math.min(100, Math.max(20, startWidthRef.current + deltaPercent))
            onResize?.(imageId, newWidth)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [widthPercent, onResize, imageId, displayScale])

    // Export mode: simple image with percentage width
    if (forExport) {
        return (
            <img
                src={src}
                alt="image"
                style={{
                    width: `${widthPercent}%`,
                    height: 'auto',
                    display: 'block',
                    margin: '0.8em auto',
                    borderRadius: '8px',
                    maxHeight: 'none',
                }}
            />
        )
    }

    // Interactive mode: wrapper div controls width, handle positioned relative to it
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                margin: '0.8em 0',
            }}
        >
            <div
                className="resizable-image-wrapper"
                style={{
                    position: 'relative',
                    width: `${widthPercent}%`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => !isResizing && setIsHovered(false)}
            >
                <img
                    src={src}
                    alt="image"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: '8px',
                        userSelect: 'none',
                        maxHeight: 'none',
                    }}
                    draggable={false}
                />
                {(isHovered || isResizing) && (
                    <div
                        className="resize-handle"
                        onMouseDown={handleMouseDown}
                        style={{
                            position: 'absolute',
                            right: '-12px',
                            bottom: '50%',
                            transform: 'translateY(50%)',
                            width: '24px',
                            height: '48px',
                            background: 'rgba(59, 130, 246, 0.9)',
                            borderRadius: '12px',
                            cursor: 'ew-resize',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            zIndex: 10,
                            border: '2px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        {/* Horizontal resize arrows icon */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8l4 4-4 4" />
                            <path d="M6 8l-4 4 4 4" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    )
}

export function CardPreview({ card, images, imageSizes, onImageResize, typography, backgroundStyle = 'classic', forExport = false, displayScale }: CardPreviewProps) {
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

    const getExportBackgroundStyle = (): React.CSSProperties => {
        switch (backgroundStyle) {
            case 'grid':
                return {
                    background: '#F6F6F6',
                    backgroundImage: `
                        linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: '28px 28px'
                }
            case 'paper':
                return {
                    background: '#f5f4f2'
                }
            case 'grain':
                return {
                    background: '#f8f9fc'
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
                        const widthPercent = imageSizes?.get(segment.content) ?? 100
                        return (
                            <ResizableImage
                                key={index}
                                src={base64}
                                imageId={segment.content}
                                widthPercent={widthPercent}
                                onResize={onImageResize}
                                forExport={forExport}
                                displayScale={displayScale}
                            />
                        )
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
