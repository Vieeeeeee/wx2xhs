import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { nanoid } from 'nanoid'

function getLineRange(text: string, index: number): { lineStart: number; lineEnd: number } {
    const lineStart = text.lastIndexOf('\n', Math.max(0, index - 1)) + 1
    const nextNewline = text.indexOf('\n', index)
    const lineEnd = nextNewline === -1 ? text.length : nextNewline
    return { lineStart, lineEnd }
}

function clampSelection(textarea: HTMLTextAreaElement, start: number, end: number) {
    const max = textarea.value.length
    const nextStart = Math.max(0, Math.min(max, start))
    const nextEnd = Math.max(0, Math.min(max, end))
    textarea.setSelectionRange(nextStart, nextEnd)
}

function runTextareaCommand(
    textarea: HTMLTextAreaElement,
    onChange: (value: string) => void,
    command: (textarea: HTMLTextAreaElement) => void
) {
    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft

    command(textarea)

    const nextSelectionStart = textarea.selectionStart ?? 0
    const nextSelectionEnd = textarea.selectionEnd ?? 0
    const nextValue = textarea.value
    onChange(nextValue)

    requestAnimationFrame(() => {
        textarea.focus()
        clampSelection(textarea, nextSelectionStart, nextSelectionEnd)
        textarea.scrollTop = scrollTop
        textarea.scrollLeft = scrollLeft
    })
}

function insertImagePlaceholder(textarea: HTMLTextAreaElement, imageId: string) {
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? start
    const text = textarea.value
    const before = text.slice(0, start)
    const after = text.slice(end)

    const placeholder = `[IMG:${imageId}]`
    const leadingNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    const trailingNewline = after.startsWith('\n') ? '' : '\n'
    const insert = leadingNewline + placeholder + trailingNewline

    textarea.setRangeText(insert, start, end, 'preserve')
    const newPos = start + insert.length
    textarea.setSelectionRange(newPos, newPos)
}

function toggleInlineFormat(textarea: HTMLTextAreaElement, prefix: string, suffix: string) {
    const value = textarea.value
    const selectionStart = textarea.selectionStart ?? 0
    const selectionEnd = textarea.selectionEnd ?? 0

    if (selectionStart !== selectionEnd) {
        const selectedText = value.slice(selectionStart, selectionEnd)

        // Case 1: selection already includes markers
        if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= prefix.length + suffix.length) {
            const inner = selectedText.slice(prefix.length, selectedText.length - suffix.length)
            textarea.setRangeText(inner, selectionStart, selectionEnd, 'preserve')
            textarea.setSelectionRange(selectionStart, selectionStart + inner.length)
            return
        }

        // Case 2: markers surround the selection
        const beforeStart = selectionStart - prefix.length
        const afterEnd = selectionEnd + suffix.length
        if (
            beforeStart >= 0 &&
            value.slice(beforeStart, selectionStart) === prefix &&
            value.slice(selectionEnd, afterEnd) === suffix
        ) {
            // Remove from right to left to avoid shifting indices.
            textarea.setRangeText('', selectionEnd, afterEnd, 'preserve')
            textarea.setRangeText('', beforeStart, selectionStart, 'preserve')
            textarea.setSelectionRange(beforeStart, selectionEnd - prefix.length)
            return
        }

        // Default: wrap selection
        textarea.setRangeText(prefix + selectedText + suffix, selectionStart, selectionEnd, 'preserve')
        textarea.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length)
        return
    }

    // No selection: toggle if caret is between markers, otherwise insert markers pair.
    const caret = selectionStart
    const beforeCaret = caret - prefix.length
    const afterCaret = caret + suffix.length
    if (beforeCaret >= 0 && value.slice(beforeCaret, caret) === prefix && value.slice(caret, afterCaret) === suffix) {
        textarea.setRangeText('', caret, afterCaret, 'preserve')
        textarea.setRangeText('', beforeCaret, caret, 'preserve')
        textarea.setSelectionRange(beforeCaret, beforeCaret)
        return
    }

    textarea.setRangeText(prefix + suffix, caret, caret, 'preserve')
    textarea.setSelectionRange(caret + prefix.length, caret + prefix.length)
}

function insertMarkdownLink(textarea: HTMLTextAreaElement) {
    const value = textarea.value
    const selectionStart = textarea.selectionStart ?? 0
    const selectionEnd = textarea.selectionEnd ?? 0

    if (selectionStart !== selectionEnd) {
        const selected = value.slice(selectionStart, selectionEnd)
        const wrapped = `[${selected}]()`
        textarea.setRangeText(wrapped, selectionStart, selectionEnd, 'preserve')
        const cursor = selectionStart + wrapped.length - 1
        textarea.setSelectionRange(cursor, cursor)
        return
    }

    const insert = '[]()'
    textarea.setRangeText(insert, selectionStart, selectionEnd, 'preserve')
    textarea.setSelectionRange(selectionStart + 1, selectionStart + 1)
}

function indentOrOutdent(textarea: HTMLTextAreaElement, outdent: boolean) {
    const value = textarea.value
    const selectionStart = textarea.selectionStart ?? 0
    const selectionEnd = textarea.selectionEnd ?? selectionStart

    // Single-caret behavior: insert/remove indentation at caret.
    if (selectionStart === selectionEnd) {
        if (!outdent) {
            textarea.setRangeText('  ', selectionStart, selectionEnd, 'end')
            return
        }
        const before = value.slice(Math.max(0, selectionStart - 2), selectionStart)
        if (before === '  ') {
            textarea.setRangeText('', selectionStart - 2, selectionStart, 'end')
        } else if (selectionStart > 0 && value[selectionStart - 1] === '\t') {
            textarea.setRangeText('', selectionStart - 1, selectionStart, 'end')
        }
        return
    }

    const { lineStart: blockStart } = getLineRange(value, selectionStart)
    const { lineEnd: blockEnd } = getLineRange(value, selectionEnd)
    const block = value.slice(blockStart, blockEnd)
    const lines = block.split('\n')

    let nextSelectionStart = selectionStart
    let nextSelectionEnd = selectionEnd
    let cursor = blockStart
    const nextLines = lines.map((line) => {
        const originalLineStart = cursor
        cursor += line.length + 1

        const indent = '  '
        if (!outdent) {
            if (selectionStart > originalLineStart) nextSelectionStart += indent.length
            if (selectionEnd > originalLineStart) nextSelectionEnd += indent.length
            return indent + line
        }

        if (line.startsWith(indent)) {
            if (selectionStart > originalLineStart) nextSelectionStart -= indent.length
            if (selectionEnd > originalLineStart) nextSelectionEnd -= indent.length
            return line.slice(indent.length)
        }
        if (line.startsWith('\t')) {
            if (selectionStart > originalLineStart) nextSelectionStart -= 1
            if (selectionEnd > originalLineStart) nextSelectionEnd -= 1
            return line.slice(1)
        }

        return line
    })

    const nextBlock = nextLines.join('\n')
    textarea.setRangeText(nextBlock, blockStart, blockEnd, 'preserve')
    clampSelection(textarea, nextSelectionStart, nextSelectionEnd)
}

function continueMarkdownListOnEnter(textarea: HTMLTextAreaElement): boolean {
    const value = textarea.value
    const selectionStart = textarea.selectionStart ?? 0
    const selectionEnd = textarea.selectionEnd ?? selectionStart
    if (selectionStart !== selectionEnd) return false

    const { lineStart, lineEnd } = getLineRange(value, selectionStart)
    const line = value.slice(lineStart, lineEnd)
    const match = /^(\s*)([-*+]|(\d+)\.)(\s+)/.exec(line)
    if (!match) return false

    const indent = match[1] ?? ''
    const marker = match[2] ?? '-'
    const number = match[3]
    const content = line.slice(match[0].length)

    // If this list item is empty, pressing Enter exits the list by removing the marker.
    if (content.trim() === '') {
        const removeFrom = lineStart + indent.length
        const removeTo = lineStart + match[0].length
        textarea.setRangeText('', removeFrom, removeTo, 'preserve')
        const newCaret = selectionStart - (removeTo - removeFrom)
        textarea.setSelectionRange(newCaret, newCaret)
        textarea.setRangeText('\n', newCaret, newCaret, 'end')
        return true
    }

    const nextMarker = number ? `${Number.parseInt(number, 10) + 1}.` : marker
    const insertion = `\n${indent}${nextMarker} `
    textarea.setRangeText(insertion, selectionStart, selectionStart, 'end')
    return true
}

function canContinueMarkdownList(text: string, caret: number): boolean {
    const { lineStart, lineEnd } = getLineRange(text, caret)
    const line = text.slice(lineStart, lineEnd)
    return /^(\s*)([-*+]|(\d+)\.)(\s+)/.test(line)
}

interface FormatToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    onChange: (value: string) => void
    onImageAdd: (id: string, base64: string) => void
    onImageRemove?: (id: string) => void
    images: Map<string, string>
}

type FormatType = 'bold' | 'italic' | 'underline' | 'highlight' | 'code'

const formatMarkers: Record<FormatType, { prefix: string; suffix: string }> = {
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '*', suffix: '*' },
    underline: { prefix: '__', suffix: '__' },
    highlight: { prefix: '==', suffix: '==' },
    code: { prefix: '`', suffix: '`' },
}

export function FormatToolbar({ textareaRef, onChange, onImageAdd, onImageRemove, images }: FormatToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const applyFormat = useCallback((type: FormatType) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const { prefix, suffix } = formatMarkers[type]
        runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, prefix, suffix))
    }, [textareaRef, onChange])

    const buttons = [
        { type: 'bold' as FormatType, icon: 'B', title: '粗体（⌘/Ctrl+B）', className: 'font-bold' },
        { type: 'italic' as FormatType, icon: 'I', title: '斜体（⌘/Ctrl+I）', className: 'italic' },
        { type: 'underline' as FormatType, icon: 'U', title: '下划线（⌘/Ctrl+U）', className: 'underline' },
        { type: 'highlight' as FormatType, icon: '󰸗', title: '高亮（⌘/Ctrl+Shift+H）', className: 'bg-yellow-200 px-1' },
        { type: 'code' as FormatType, icon: '</>', title: '行内代码（⌘/Ctrl+E）', className: 'font-mono text-[11px]' },
    ]

    const removeEmptyLines = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        runTextareaCommand(textarea, onChange, (el) => {
            const text = el.value
            const selectionStart = el.selectionStart ?? 0
            const selectionEnd = el.selectionEnd ?? 0

            let readIndex = 0
            let next = ''
            let nextSelectionStart = selectionStart
            let nextSelectionEnd = selectionEnd

            const lines = text.split('\n')
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                const hadNewline = i < lines.length - 1
                const rawLineLength = line.length + (hadNewline ? 1 : 0)
                const shouldDrop = line.trim() === ''

                if (!shouldDrop) {
                    next += line
                    if (hadNewline) next += '\n'
                } else {
                    // If we're dropping content before selection, shift selection left.
                    if (readIndex + rawLineLength <= selectionStart) {
                        nextSelectionStart -= rawLineLength
                        nextSelectionEnd -= rawLineLength
                    } else if (readIndex < selectionStart) {
                        // Dropped line overlaps selection start; clamp to this point.
                        nextSelectionStart = Math.min(nextSelectionStart, readIndex)
                        nextSelectionEnd = Math.min(nextSelectionEnd, readIndex)
                    }
                }

                readIndex += rawLineLength
            }

            el.setRangeText(next, 0, el.value.length, 'preserve')
            clampSelection(el, nextSelectionStart, nextSelectionEnd)
        })
    }, [textareaRef, onChange])

    const insertImageAtCursor = useCallback((base64: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const imageId = nanoid(8)
        onImageAdd(imageId, base64)

        runTextareaCommand(textarea, onChange, (el) => {
            insertImagePlaceholder(el, imageId)
        })
    }, [textareaRef, onChange, onImageAdd])

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

    const handleRemoveImage = useCallback((id: string) => {
        // Remove from images map via callback
        onImageRemove?.(id)
        // Remove placeholder from text
        const textarea = textareaRef.current
        if (!textarea) return

        runTextareaCommand(textarea, onChange, (el) => {
            const placeholder = `[IMG:${id}]`
            const text = el.value
            const index = text.indexOf(placeholder)
            if (index === -1) return

            const afterIndex = index + placeholder.length
            const removeStart = index > 0 && text[index - 1] === '\n' ? index - 1 : index
            const removeEnd = text[afterIndex] === '\n' ? afterIndex + 1 : afterIndex
            el.setRangeText('', removeStart, removeEnd, 'preserve')
        })
    }, [textareaRef, onChange, onImageRemove])

    // Get image entries for display
    const imageEntries = Array.from(images.entries())

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1 p-2 bg-stone-50 border border-stone-200 rounded-t-lg border-b-0">
                {buttons.map(({ type, icon, title, className }) => (
                    <button
                        key={type}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat(type) }}
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
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault()
                        const textarea = textareaRef.current
                        if (!textarea) return
                        runTextareaCommand(textarea, onChange, (el) => insertMarkdownLink(el))
                    }}
                    title="插入链接（⌘/Ctrl+K）"
                    className="px-2 h-8 flex items-center justify-center rounded
                     text-stone-600 hover:bg-stone-200 hover:text-stone-800
                     transition-colors text-xs"
                >
                    🔗 链接
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); removeEmptyLines() }}
                    title="去除空行"
                    className="px-2 h-8 flex items-center justify-center rounded
                     text-stone-600 hover:bg-stone-200 hover:text-stone-800
                     transition-colors text-xs"
                >
                    去空行
                </button>
                <button
                    type="button"
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
                        <div key={id} className="relative shrink-0 group">
                            <img
                                src={base64}
                                alt={`IMG:${id}`}
                                className="h-12 w-auto rounded border border-stone-300"
                            />
                            <button
                                onClick={() => handleRemoveImage(id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white 
                                           flex items-center justify-center text-xs font-bold
                                           opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer
                                           hover:bg-red-600 shadow-sm"
                                title="删除图片"
                            >
                                ×
                            </button>
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
    onImageRemove?: (id: string) => void
    images: Map<string, string>
    placeholder?: string
    className?: string
}

export interface RichTextInputHandle {
    scrollToText: (text: string) => void
    scrollToPosition: (position: number, length: number) => void
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
    ({ value, onChange, onImageAdd, onImageRemove, images, placeholder, className = '' }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null)
        const isComposingRef = useRef(false)

        const scrollToIndex = useCallback((index: number, length: number) => {
            if (!textareaRef.current || index < 0) return

            const textarea = textareaRef.current

            // Mirror-based measurement to avoid cumulative lineHeight errors on long text.
            const computedStyle = window.getComputedStyle(textarea)
            const mirror = document.createElement('div')
            mirror.style.position = 'absolute'
            mirror.style.left = '-99999px'
            mirror.style.top = '0'
            mirror.style.visibility = 'hidden'
            mirror.style.whiteSpace = 'pre-wrap'
            mirror.style.wordWrap = 'break-word'
            mirror.style.overflowWrap = 'break-word'
            mirror.style.width = `${textarea.clientWidth}px`
            mirror.style.fontFamily = computedStyle.fontFamily
            mirror.style.fontSize = computedStyle.fontSize
            mirror.style.fontWeight = computedStyle.fontWeight
            mirror.style.fontStyle = computedStyle.fontStyle
            mirror.style.letterSpacing = computedStyle.letterSpacing
            mirror.style.lineHeight = computedStyle.lineHeight
            mirror.style.padding = computedStyle.padding
            mirror.style.border = '0'
            mirror.style.boxSizing = 'border-box'

            const before = value.slice(0, Math.min(index, value.length))
            mirror.textContent = before
            const marker = document.createElement('span')
            marker.textContent = '\u200b'
            mirror.appendChild(marker)
            document.body.appendChild(mirror)

            const caretTop = marker.offsetTop
            document.body.removeChild(mirror)

            const visibleHeight = textarea.clientHeight
            const targetScroll = Math.max(0, caretTop - visibleHeight / 3)

            textarea.scrollTop = targetScroll
            textarea.focus()
            textarea.setSelectionRange(index, index + length)
        }, [value])

        useImperativeHandle(ref, () => ({
            scrollToText: (searchText: string) => {
                if (!searchText) return
                const index = value.indexOf(searchText)
                if (index !== -1) {
                    scrollToIndex(index, searchText.length)
                }
            },
            scrollToPosition: (position: number, length: number) => {
                scrollToIndex(position, length)
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

                        runTextareaCommand(textarea, onChange, (el) => {
                            insertImagePlaceholder(el, imageId)
                        })
                    }
                    reader.readAsDataURL(file)
                    return
                }
            }
        }, [onChange, onImageAdd])

        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (isComposingRef.current || e.nativeEvent.isComposing) return
            const textarea = textareaRef.current
            if (!textarea) return

            const isMod = e.ctrlKey || e.metaKey

            if (e.key === 'Tab') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => indentOrOutdent(el, e.shiftKey))
                return
            }

            if (e.key === 'Enter' && !isMod && !e.altKey && !e.shiftKey) {
                const caret = textarea.selectionStart ?? 0
                if (canContinueMarkdownList(textarea.value, caret)) {
                    e.preventDefault()
                    runTextareaCommand(textarea, onChange, (el) => {
                        continueMarkdownListOnEnter(el)
                    })
                }
                return
            }

            if (!isMod || e.altKey) return

            const key = e.key.toLowerCase()
            if (!e.shiftKey && key === 'b') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, '**', '**'))
                return
            }
            if (!e.shiftKey && key === 'i') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, '*', '*'))
                return
            }
            if (!e.shiftKey && key === 'u') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, '__', '__'))
                return
            }
            if (e.shiftKey && key === 'h') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, '==', '=='))
                return
            }
            if (!e.shiftKey && key === 'e') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => toggleInlineFormat(el, '`', '`'))
                return
            }
            if (!e.shiftKey && key === 'k') {
                e.preventDefault()
                runTextareaCommand(textarea, onChange, (el) => insertMarkdownLink(el))
            }
        }, [onChange])

        return (
            <div className={`flex flex-col ${className}`}>
                <FormatToolbar
                    textareaRef={textareaRef}
                    onChange={onChange}
                    onImageAdd={onImageAdd}
                    onImageRemove={onImageRemove}
                    images={images}
                />
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => { isComposingRef.current = true }}
                    onCompositionEnd={() => { isComposingRef.current = false }}
                    placeholder={placeholder}
                    className="flex-1 min-h-0 p-4 border border-stone-200 rounded-b-lg resize-none
                       text-stone-800 text-sm leading-relaxed
                       focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent
                       placeholder:text-stone-400"
                />
            </div>
        )
    }
)

RichTextInput.displayName = 'RichTextInput'
