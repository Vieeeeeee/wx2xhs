import { useState, useRef, useEffect, useCallback } from 'react'
import type { Card } from '../types'

interface CardThumbnailProps {
    card: Card
    index: number
    isSelected: boolean
    onClick: () => void
    onTextChange?: (cardId: string, newText: string) => void
}

export function CardThumbnail({ card, index, isSelected, onClick, onTextChange }: CardThumbnailProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState<number | null>(null)

    // Measure content height when expanded
    useEffect(() => {
        if (isExpanded && contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight)
        }
    }, [isExpanded, card.text])

    // Get preview text (first 2 lines or 60 chars)
    const getPreviewText = (text: string) => {
        const lines = text.split('\n').slice(0, 2)
        const preview = lines.join('\n')
        return preview.length > 60 ? preview.slice(0, 60) + '...' : preview
    }

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        const willExpand = !isExpanded
        setIsExpanded(willExpand)
        // When expanding, also select this card for preview
        if (willExpand) {
            onClick()
        }
    }, [isExpanded, onClick])

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const newText = e.currentTarget.innerText || ''
        if (onTextChange) {
            onTextChange(card.id, newText)
        }
    }, [card.id, onTextChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Allow all keyboard shortcuts without closing
        e.stopPropagation()
    }, [])

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (isExpanded) {
            // When expanded, clicking content area shouldn't close or trigger selection
            e.stopPropagation()
        } else {
            onClick()
        }
    }, [isExpanded, onClick])

    return (
        <div
            onClick={handleClick}
            className={`
                relative rounded-lg transition-all duration-300 ease-out
                border-2
                ${isSelected
                    ? 'border-stone-800 bg-stone-100 shadow-md'
                    : 'border-transparent bg-white hover:border-stone-300 hover:shadow-sm'
                }
                ${isExpanded ? '' : 'cursor-pointer'}
            `}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <span className="text-xs font-medium text-stone-500">#{index + 1}</span>
                <span className="text-xs text-stone-400">
                    {card.text.replace(/\s/g, '').length} 字
                </span>
            </div>

            {/* Content Area */}
            <div
                className="px-3 pb-8 overflow-hidden transition-all duration-300 ease-out"
                style={{
                    maxHeight: isExpanded ? (contentHeight || 500) + 'px' : '52px',
                }}
            >
                <div
                    ref={contentRef}
                    contentEditable={isExpanded}
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={isExpanded ? () => onClick() : undefined}
                    onClick={isExpanded ? (e) => { e.stopPropagation(); onClick(); } : undefined}
                    className={`
                        text-sm text-stone-700 leading-relaxed whitespace-pre-wrap
                        outline-none
                        ${isExpanded ? 'cursor-text' : 'line-clamp-2'}
                    `}
                >
                    {isExpanded ? card.text : getPreviewText(card.text)}
                </div>
            </div>

            {/* Expand/Collapse Button - Bottom Right */}
            <button
                onClick={handleToggle}
                className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center 
                           rounded-full bg-stone-100 hover:bg-stone-200 
                           text-stone-400 hover:text-stone-600 
                           transition-all duration-200"
                title={isExpanded ? '收起' : '展开'}
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="transition-transform duration-300"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                    <path
                        d="M2.5 4.5L6 8L9.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    )
}
