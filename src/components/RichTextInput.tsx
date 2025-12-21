import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { nanoid } from 'nanoid'

interface FormatToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    value: string
    onChange: (value: string) => void
    onImageAdd: (id: string, base64: string) => void
    images: Map<string, string>
}

type FormatType = 'bold' | 'italic' | 'underline' | 'highlight'

const formatMarkers: Record<FormatType, { prefix: string; suffix: string }> = {
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '*', suffix: '*' },
    underline: { prefix: '__', suffix: '__' },
    highlight: { prefix: '==', suffix: '==' },
}

export function FormatToolbar({ textareaRef, value, onChange, onImageAdd, images }: FormatToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const applyFormat = useCallback((type: FormatType) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)
        const { prefix, suffix } = formatMarkers[type]

        if (selectedText) {
            const before = value.substring(0, start)
            const after = value.substring(end)
            const newValue = before + prefix + selectedText + suffix + after
            onChange(newValue)

            requestAnimationFrame(() => {
                textarea.focus()
                textarea.setSelectionRange(start + prefix.length, end + prefix.length)
            })
        } else {
            const before = value.substring(0, start)
            const after = value.substring(start)
            const newValue = before + prefix + suffix + after
            onChange(newValue)

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
        const lines = value.split('\n')
        const filteredLines = lines.filter(line => line.trim() !== '')
        onChange(filteredLines.join('\n'))
    }, [value, onChange])

    const insertImageAtCursor = useCallback((base64: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const imageId = nanoid(8)
        onImageAdd(imageId, base64)

        const start = textarea.selectionStart
        const before = value.substring(0, start)
        const after = value.substring(start)
        const placeholder = `[IMG:${imageId}]`
        const newValue = before + placeholder + '\n' + after
        onChange(newValue)

        requestAnimationFrame(() => {
            textarea.focus()
            const newPos = start + placeholder.length + 1
            textarea.setSelectionRange(newPos, newPos)
        })
    }, [textareaRef, value, onChange, onImageAdd])

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = () => {
            const base64 = reader.result as string
            insertImageAtCursor(base64)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }, [insertImageAtCursor])

    // Get image entries for display
    const imageEntries = Array.from(images.entries())

    return (
        <div className="flex flex-col">
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
                <button
                    onClick={() => fileInputRef.current?.click()}
                    title="上传图片"
                    className="px-2 h-8 flex items-center justify-center rounded
                     text-stone-600 hover:bg-stone-200 hover:text-stone-800
                     transition-colors text-xs"
                >
                    📷 图片
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <div className="flex-1" />
                <span className="text-xs text-stone-400 pr-2">
                    支持粘贴图片
                </span>
            </div>
            {/* Image thumbnails gallery */}
            {imageEntries.length > 0 && (
                <div className="flex gap-2 p-2 bg-stone-100 border-x border-stone-200 overflow-x-auto">
                    {imageEntries.map(([id, base64]) => (
                        <div key={id} className="relative shrink-0">
                            <img
                                src={base64}
                                alt={`IMG:${id}`}
                                className="h-12 w-auto rounded border border-stone-300"
                            />
                            <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/50 text-white rounded-b">
                                {id}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface RichTextInputProps {
    value: string
    onChange: (value: string) => void
    onImageAdd: (id: string, base64: string) => void
    images: Map<string, string>
    placeholder?: string
    className?: string
}

export interface RichTextInputHandle {
    scrollToText: (text: string) => void
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
    ({ value, onChange, onImageAdd, images, placeholder, className = '' }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null)

        useImperativeHandle(ref, () => ({
            scrollToText: (searchText: string) => {
                if (!textareaRef.current || !searchText) return

                const index = value.indexOf(searchText)
                if (index !== -1) {
                    const textarea = textareaRef.current
                    const textBeforeMatch = value.substring(0, index)
                    const linesBeforeMatch = textBeforeMatch.split('\n').length - 1
                    const computedStyle = window.getComputedStyle(textarea)
                    const lineHeight = parseFloat(computedStyle.lineHeight) || 24
                    const targetScroll = Math.max(0, (linesBeforeMatch - 2) * lineHeight)
                    textarea.scrollTop = targetScroll
                    textarea.focus()
                    textarea.setSelectionRange(index, index + searchText.length)
                }
            }
        }))

        // Handle paste event for images
        const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.type.startsWith('image/')) {
                    e.preventDefault()
                    const file = item.getAsFile()
                    if (!file) return

                    const reader = new FileReader()
                    reader.onload = () => {
                        const base64 = reader.result as string
                        const textarea = textareaRef.current
                        if (!textarea) return

                        const imageId = nanoid(8)
                        onImageAdd(imageId, base64)

                        const start = textarea.selectionStart
                        const before = value.substring(0, start)
                        const after = value.substring(start)
                        const placeholder = `[IMG:${imageId}]`
                        const newValue = before + placeholder + '\n' + after
                        onChange(newValue)
                    }
                    reader.readAsDataURL(file)
                    return
                }
            }
        }, [value, onChange, onImageAdd])

        return (
            <div className={`flex flex-col ${className}`}>
                <FormatToolbar
                    textareaRef={textareaRef}
                    value={value}
                    onChange={onChange}
                    onImageAdd={onImageAdd}
                    images={images}
                />
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    className="flex-1 min-h-0 p-4 border border-stone-200 rounded-b-lg resize-none
                       text-stone-800 text-base leading-relaxed
                       focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent
                       placeholder:text-stone-400"
                />
            </div>
        )
    }
)

RichTextInput.displayName = 'RichTextInput'


