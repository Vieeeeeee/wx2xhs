import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'

interface FormatToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    value: string
    onChange: (value: string) => void
}

type FormatType = 'bold' | 'italic' | 'underline' | 'highlight'

const formatMarkers: Record<FormatType, { prefix: string; suffix: string }> = {
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '*', suffix: '*' },
    underline: { prefix: '__', suffix: '__' },
    highlight: { prefix: '==', suffix: '==' },
}

export function FormatToolbar({ textareaRef, value, onChange }: FormatToolbarProps) {
    const applyFormat = useCallback((type: FormatType) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)
        const { prefix, suffix } = formatMarkers[type]

        // If text is selected, wrap it
        if (selectedText) {
            const before = value.substring(0, start)
            const after = value.substring(end)
            const newValue = before + prefix + selectedText + suffix + after
            onChange(newValue)

            // Restore selection after React re-render
            requestAnimationFrame(() => {
                textarea.focus()
                textarea.setSelectionRange(start + prefix.length, end + prefix.length)
            })
        } else {
            // Insert markers at cursor
            const before = value.substring(0, start)
            const after = value.substring(start)
            const newValue = before + prefix + suffix + after
            onChange(newValue)

            // Position cursor between markers
            requestAnimationFrame(() => {
                textarea.focus()
                textarea.setSelectionRange(start + prefix.length, start + prefix.length)
            })
        }
    }, [textareaRef, value, onChange])

    const buttons = [
        { type: 'bold' as FormatType, icon: 'B', title: '粗体', className: 'font-bold' },
        { type: 'italic' as FormatType, icon: 'I', title: '斜体', className: 'italic' },
        { type: 'underline' as FormatType, icon: 'U', title: '下划线', className: 'underline' },
        { type: 'highlight' as FormatType, icon: '󰸗', title: '高亮', className: 'bg-yellow-200 px-1' },
    ]

    const removeEmptyLines = useCallback(() => {
        // Remove lines that are empty or contain only whitespace
        const lines = value.split('\n')
        const filteredLines = lines.filter(line => line.trim() !== '')
        onChange(filteredLines.join('\n'))
    }, [value, onChange])

    return (
        <div className="flex items-center gap-1 p-2 bg-stone-50 border border-stone-200 rounded-t-lg border-b-0">
            {buttons.map(({ type, icon, title, className }) => (
                <button
                    key={type}
                    onClick={() => applyFormat(type)}
                    title={title}
                    className={`w-8 h-8 flex items-center justify-center rounded
                     text-stone-600 hover:bg-stone-200 hover:text-stone-800
                     transition-colors text-sm ${className}`}
                >
                    {type === 'highlight' ? (
                        <span className="w-5 h-5 rounded bg-yellow-300 flex items-center justify-center text-xs">A</span>
                    ) : (
                        icon
                    )}
                </button>
            ))}
            <div className="w-px h-5 bg-stone-300 mx-1" />
            <button
                onClick={removeEmptyLines}
                title="去除空行"
                className="px-2 h-8 flex items-center justify-center rounded
                 text-stone-600 hover:bg-stone-200 hover:text-stone-800
                 transition-colors text-xs"
            >
                去空行
            </button>
            <div className="flex-1" />
            <span className="text-xs text-stone-400 pr-2">
                选中文字后点击按钮添加格式
            </span>
        </div>
    )
}

interface RichTextInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export interface RichTextInputHandle {
    scrollToText: (text: string) => void
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(({ value, onChange, placeholder, className = '' }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
        scrollToText: (searchText: string) => {
            if (!textareaRef.current || !searchText) return

            const index = value.indexOf(searchText)
            if (index !== -1) {
                const textarea = textareaRef.current

                // Calculate which line the match is on
                const textBeforeMatch = value.substring(0, index)
                const linesBeforeMatch = textBeforeMatch.split('\n').length - 1

                // Get approximate line height (using computed style)
                const computedStyle = window.getComputedStyle(textarea)
                const lineHeight = parseFloat(computedStyle.lineHeight) || 24

                // Calculate scroll position (scroll to a few lines before the match)
                const targetScroll = Math.max(0, (linesBeforeMatch - 2) * lineHeight)

                // Set scroll position
                textarea.scrollTop = targetScroll

                // Focus and select the text
                textarea.focus()
                textarea.setSelectionRange(index, index + searchText.length)
            }
        }
    }))

    return (
        <div className={`flex flex-col ${className}`}>
            <FormatToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 min-h-0 p-4 border border-stone-200 rounded-b-lg resize-none
                   text-stone-800 text-base leading-relaxed
                   focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent
                   placeholder:text-stone-400"
            />
        </div>
    )
})

RichTextInput.displayName = 'RichTextInput'
