/**
 * Parse markdown-like formatting and return HTML
 * Supports: **bold**, *italic*, __underline__, ==highlight==
 */
export function parseFormattedText(text: string): string {
    // Split by newlines to form paragraphs
    const paragraphs = text.split('\n')

    const processedParagraphs = paragraphs.map(p => {
        // If paragraph is empty, return empty string (ignores empty lines)
        if (!p.trim()) return ''

        const html = p
            // Escape HTML entities first
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Bold: **text**
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic: *text*
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Underline: __text__
            .replace(/__(.+?)__/g, '<u>$1</u>')
            // Highlight: ==text==
            .replace(/==(.+?)==/g, '<mark>$1</mark>')

        return `<p>${html}</p>`
    })

    return processedParagraphs.join('')
}
