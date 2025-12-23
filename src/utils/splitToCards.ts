import { nanoid } from 'nanoid'
import type { Card } from '../types'

// Card layout constants (matching CSS) - 3:4 aspect ratio (1080x1440)
const CARD_HEIGHT = 1440
const PADDING_TOP = 100
const PADDING_BOTTOM = 80
const CONTENT_WIDTH = 880 // 1080 - 100*2 padding
const CONTENT_HEIGHT = CARD_HEIGHT - PADDING_TOP - PADDING_BOTTOM // 1240px effective
const CONTENT_HEIGHT_LIMIT = CONTENT_HEIGHT - 2 // safety buffer
const IMAGE_MAX_HEIGHT_PX = 520
const BASE_CHAR_EM = 0.99

export interface Typography {
    fontSize: number
    lineHeight: number
    paragraphSpacing: number
    letterSpacing: number
}

type ImageMeta = { width: number; height: number }

export const DEFAULT_TYPOGRAPHY: Typography = {
    fontSize: 32,
    lineHeight: 1.6,
    paragraphSpacing: 1.2,
    letterSpacing: 0.05,
}

// ===== HELPER FUNCTIONS (unchanged) =====

function stripMarkdownMarkers(text: string): string {
    let result = text
    result = result.replace(/==/g, '')
    result = result.replace(/\*\*/g, '')
    result = result.replace(/__/g, '')
    result = result.replace(/(?<!\*)\*(?!\*)/g, '')
    result = result.replace(/\[IMG:[a-zA-Z0-9_-]+\]/g, '')
    return result
}

function isInsideImagePlaceholder(text: string, cutIndex: number): boolean {
    const lastOpen = text.lastIndexOf('[IMG:', cutIndex - 1)
    if (lastOpen === -1) return false
    const close = text.indexOf(']', lastOpen)
    return close !== -1 && close >= cutIndex
}

function isCutSafe(text: string, cutIndex: number): boolean {
    if (cutIndex <= 0) return false
    if (cutIndex >= text.length) return true
    if (isInsideImagePlaceholder(text, cutIndex)) return false
    const prev = text[cutIndex - 1]
    const next = text[cutIndex]
    if ((prev === '=' && next === '=') || (prev === '_' && next === '_') || (prev === '*' && next === '*')) return false
    return true
}

function charsPerLineForFontPx(fontPx: number, letterSpacingEm: number): number {
    const charWidthPx = fontPx * (BASE_CHAR_EM + letterSpacingEm)
    return Math.max(1, Math.floor(CONTENT_WIDTH / charWidthPx))
}

type Block =
    | { kind: 'paragraph'; text: string }
    | { kind: 'heading'; level: 1 | 2 | 3; text: string }
    | { kind: 'image'; id: string }

function parseTextBlocks(text: string): Block[] {
    const blocks: Block[] = []
    const lines = text.split(/\r?\n/)
    let paragraphLines: string[] = []

    const flushParagraph = () => {
        const raw = paragraphLines.join('\n')
        if (raw.trim()) blocks.push({ kind: 'paragraph', text: raw })
        paragraphLines = []
    }

    for (const line of lines) {
        if (!line.trim()) {
            flushParagraph()
            continue
        }
        const headingMatch = /^\s*(#{1,3})\s+(.+?)\s*$/.exec(line)
        if (headingMatch) {
            flushParagraph()
            const level = headingMatch[1].length as 1 | 2 | 3
            blocks.push({ kind: 'heading', level, text: headingMatch[2] })
            continue
        }
        paragraphLines.push(line)
    }

    flushParagraph()
    return blocks
}

function parseBlocks(text: string): Block[] {
    const blocks: Block[] = []
    const regex = /\[IMG:([a-zA-Z0-9_-]+)\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
        const before = text.slice(lastIndex, match.index)
        blocks.push(...parseTextBlocks(before))
        blocks.push({ kind: 'image', id: match[1] })
        lastIndex = regex.lastIndex
    }

    const tail = text.slice(lastIndex)
    blocks.push(...parseTextBlocks(tail))
    return blocks.filter(b => (b.kind !== 'paragraph' ? true : b.text.trim() !== ''))
}

function estimateParagraphHeightPx(text: string, typography: Typography): number {
    const visualText = stripMarkdownMarkers(text)
    const lineHeightPx = typography.fontSize * typography.lineHeight
    const charsPerLine = charsPerLineForFontPx(typography.fontSize, typography.letterSpacing)

    const lines = visualText.split(/\r?\n/)
    let wrappedLines = 0
    for (const line of lines) {
        const trimmed = line.trimEnd()
        if (!trimmed) continue
        wrappedLines += Math.max(1, Math.ceil(trimmed.length / charsPerLine))
    }

    return wrappedLines * lineHeightPx
}

function estimateHeadingBlockPx(block: Extract<Block, { kind: 'heading' }>, typography: Typography, isFirst: boolean) {
    const base = typography.fontSize
    const sizeMultiplier = block.level === 1 ? 1.5 : block.level === 2 ? 1.25 : 1.1
    const headingFontPx = base * sizeMultiplier
    const headingLineHeight = block.level === 1 ? 1.3 : block.level === 2 ? 1.4 : 1.5
    const charsPerLine = charsPerLineForFontPx(headingFontPx, typography.letterSpacing)
    const wrappedLines = Math.max(1, Math.ceil(block.text.trim().length / charsPerLine))
    const heightPx = wrappedLines * headingFontPx * headingLineHeight

    const marginTopEm = block.level === 1 ? 0.5 : block.level === 2 ? 0.4 : 0.3
    const marginBottomEm = block.level === 1 ? 0.8 : block.level === 2 ? 0.6 : 0.5
    const marginTopPx = isFirst ? 0 : headingFontPx * marginTopEm
    const marginBottomPx = headingFontPx * marginBottomEm

    return { heightPx, marginTopPx, marginBottomPx }
}

function estimateImageBlockPx(id: string, typography: Typography, imageMeta?: Map<string, ImageMeta>) {
    const meta = imageMeta?.get(id)
    const aspectHeight = meta ? (CONTENT_WIDTH * meta.height) / Math.max(1, meta.width) : (CONTENT_WIDTH * 9) / 16
    const heightPx = Math.min(IMAGE_MAX_HEIGHT_PX, Math.round(aspectHeight))
    const marginPx = typography.fontSize * 0.8
    return { heightPx, marginTopPx: marginPx, marginBottomPx: marginPx }
}

function estimateCardContentHeightPx(text: string, typography: Typography, imageMeta?: Map<string, ImageMeta>): number {
    const content = text.trim()
    if (!content) return 0

    const blocks = parseBlocks(content)
    if (blocks.length === 0) return 0

    const paragraphMarginPx = typography.fontSize * typography.paragraphSpacing
    const lastParagraphIndex = (() => {
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (blocks[i]?.kind === 'paragraph') return i
        }
        return -1
    })()

    let total = 0
    let prevBottomMargin = 0

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]

        let marginTopPx = 0
        let heightPx = 0
        let marginBottomPx = 0

        if (block.kind === 'paragraph') {
            heightPx = estimateParagraphHeightPx(block.text, typography)
            marginBottomPx = i !== lastParagraphIndex ? paragraphMarginPx : 0
        } else if (block.kind === 'heading') {
            const h = estimateHeadingBlockPx(block, typography, i === 0)
            marginTopPx = h.marginTopPx
            heightPx = h.heightPx
            marginBottomPx = h.marginBottomPx
        } else {
            const img = estimateImageBlockPx(block.id, typography, imageMeta)
            marginTopPx = img.marginTopPx
            heightPx = img.heightPx
            marginBottomPx = img.marginBottomPx
        }

        if (i === 0) {
            total += marginTopPx + heightPx
        } else {
            total += Math.max(prevBottomMargin, marginTopPx) + heightPx
        }

        prevBottomMargin = marginBottomPx
    }

    total += prevBottomMargin
    return total
}

function collectCandidateCuts(text: string, maxIndex: number): number[] {
    const candidates: number[] = []
    const limited = text.slice(0, maxIndex)
    let match: RegExpExecArray | null

    // Paragraph breaks
    const paraRegex = /\n{2,}/g
    while ((match = paraRegex.exec(limited)) !== null) {
        candidates.push(match.index + match[0].length)
    }

    // Sentence endings
    const cjkSentenceRegex = /[。！？]/g
    while ((match = cjkSentenceRegex.exec(limited)) !== null) {
        candidates.push(match.index + 1)
    }
    const latinSentenceRegex = /[!?](?=\s|$)|\.(?=\s|$)/g
    while ((match = latinSentenceRegex.exec(limited)) !== null) {
        candidates.push(match.index + match[0].length)
    }

    // Newlines as fallback
    const lineRegex = /\n/g
    while ((match = lineRegex.exec(limited)) !== null) {
        candidates.push(match.index + 1)
    }

    const dedup = Array.from(new Set(candidates.filter(i => i > 0 && i <= maxIndex)))
    dedup.sort((a, b) => a - b)
    return dedup
}

function findMaxFittingCut(text: string, typography: Typography, imageMeta?: Map<string, ImageMeta>): number {
    if (estimateCardContentHeightPx(text, typography, imageMeta) <= CONTENT_HEIGHT_LIMIT) return text.length

    let low = 1
    let high = text.length
    let best = 1
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const height = estimateCardContentHeightPx(text.slice(0, mid).trimEnd(), typography, imageMeta)
        if (height <= CONTENT_HEIGHT_LIMIT) {
            best = mid
            low = mid + 1
        } else {
            high = mid - 1
        }
    }

    return best
}

function chooseCut(text: string, typography: Typography, imageMeta?: Map<string, ImageMeta>, minCutIndex = 1): number {
    const trimmedEnd = text.trimEnd()
    if (!trimmedEnd) return 0
    if (estimateCardContentHeightPx(trimmedEnd, typography, imageMeta) <= CONTENT_HEIGHT_LIMIT) return trimmedEnd.length

    const maxFitRaw = findMaxFittingCut(trimmedEnd, typography, imageMeta)
    const maxFit = Math.max(minCutIndex, maxFitRaw)
    const maxFitHeight = estimateCardContentHeightPx(trimmedEnd.slice(0, maxFit).trimEnd(), typography, imageMeta)

    const candidates = collectCandidateCuts(trimmedEnd, maxFit)
    const windowStart = Math.max(minCutIndex, Math.max(maxFit - 2500, Math.floor(maxFit * 0.7)))

    let bestCandidate = -1
    let bestHeight = -1

    for (let i = candidates.length - 1; i >= 0; i--) {
        const candidate = candidates[i]
        if (candidate < windowStart) break
        if (candidate < minCutIndex) continue
        if (!isCutSafe(trimmedEnd, candidate)) continue

        const left = trimmedEnd.slice(0, candidate).trimEnd()
        if (!left) continue

        const h = estimateCardContentHeightPx(left, typography, imageMeta)
        if (h > CONTENT_HEIGHT_LIMIT) continue

        if (h > bestHeight || (h === bestHeight && candidate > bestCandidate)) {
            bestHeight = h
            bestCandidate = candidate
            if (h >= CONTENT_HEIGHT_LIMIT * 0.985) break
        }
    }

    if (bestCandidate === -1) return maxFit
    if (bestHeight < maxFitHeight * 0.92) return maxFit

    return Math.max(minCutIndex, bestCandidate)
}

// ===== NEW PUBLIC FUNCTIONS =====

/**
 * Calculate optimal page break positions for the given text and typography.
 * Returns array of character indices where `---` should be inserted.
 */
export function calculateOptimalPageBreaks(
    text: string,
    typography: Typography = DEFAULT_TYPOGRAPHY,
    imageMeta?: Map<string, ImageMeta>
): number[] {
    // First, strip any existing --- markers to get clean text
    const cleanText = text.replace(/^[ \t]*---[ \t]*$/gm, '').replace(/\n{3,}/g, '\n\n')

    const breakPositions: number[] = []
    let cursor = 0

    while (cursor < cleanText.length) {
        // Skip leading whitespace
        while (cursor < cleanText.length && /\s/.test(cleanText[cursor]!)) cursor++
        if (cursor >= cleanText.length) break

        const remaining = cleanText.slice(cursor)
        const cutIndex = chooseCut(remaining, typography, imageMeta)

        if (cutIndex <= 0 || cutIndex >= remaining.length) break

        // Find a good break point (prefer newline boundaries)
        let breakPos = cursor + cutIndex

        // Look for a nearby newline to break cleanly
        const nearbyNewline = cleanText.lastIndexOf('\n', breakPos)
        if (nearbyNewline > cursor && breakPos - nearbyNewline < 200) {
            breakPos = nearbyNewline + 1
        }

        breakPositions.push(breakPos)
        cursor = breakPos
    }

    return breakPositions
}

/**
 * Insert `---` page break markers at the specified positions.
 * Returns the new text with markers inserted.
 */
export function insertPageBreaks(text: string, breakPositions: number[]): string {
    if (breakPositions.length === 0) return text

    // Sort positions in descending order to insert from end to start
    const sorted = [...breakPositions].sort((a, b) => b - a)

    let result = text
    for (const pos of sorted) {
        if (pos <= 0 || pos >= result.length) continue

        // Insert --- on its own line
        const before = result.slice(0, pos).trimEnd()
        const after = result.slice(pos).trimStart()
        result = before + '\n\n---\n\n' + after
    }

    return result
}

/**
 * Remove all --- page break markers from text.
 */
export function removePageBreaks(text: string): string {
    return text.replace(/\n*^[ \t]*---[ \t]*$\n*/gm, '\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Recalculate and update page break positions in text.
 * Preserves content while adjusting --- positions for new typography.
 */
export function recalculatePageBreaks(
    text: string,
    typography: Typography = DEFAULT_TYPOGRAPHY,
    imageMeta?: Map<string, ImageMeta>
): string {
    const cleanText = removePageBreaks(text)
    const breakPositions = calculateOptimalPageBreaks(cleanText, typography, imageMeta)
    return insertPageBreaks(cleanText, breakPositions)
}

// ===== SIMPLIFIED splitToCards =====

/**
 * Split text into cards based ONLY on --- markers.
 * No automatic height-based splitting - just splits at each ---.
 */
export function splitToCards(text: string): Card[] {
    const cards: Card[] = []
    const delimiterRegex = /^[ \t]*---[ \t]*$/gm

    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = delimiterRegex.exec(text)) !== null) {
        const lineStart = match.index
        const content = text.slice(lastIndex, lineStart).trim()

        if (content) {
            cards.push({
                id: nanoid(),
                text: content,
                startOffset: lastIndex,
            })
        }

        // Skip past the delimiter and any trailing newline
        let delimiterEnd = match.index + match[0].length
        if (text[delimiterEnd] === '\r' && text[delimiterEnd + 1] === '\n') delimiterEnd += 2
        else if (text[delimiterEnd] === '\n') delimiterEnd += 1

        lastIndex = delimiterEnd
    }

    // Add remaining content after last delimiter
    const remaining = text.slice(lastIndex).trim()
    if (remaining) {
        cards.push({
            id: nanoid(),
            text: remaining,
            startOffset: lastIndex,
        })
    }

    // Ensure at least one card
    if (cards.length === 0) {
        cards.push({ id: nanoid(), text: text.trim() || '', startOffset: 0 })
    }

    return cards
}
