import { nanoid } from 'nanoid'
import type { Card } from '../types'

/**
 * Split text into cards based ONLY on manual delimiters (---)
 * User request: "Do not auto-paginate if there are no page breaks"
 */
export function splitToCards(text: string): Card[] {
    // Split by manual delimiter "---" (on its own line)
    const sections = text.split(/(?:\r?\n|^)---\r?\n/g)

    const cards: Card[] = []

    sections.forEach(section => {
        // Trim surrounding whitespace but preserve internal formatting
        const trimmed = section.trim()

        if (trimmed) {
            cards.push({ id: nanoid(), text: trimmed })
        }
    })

    // If no cards were created (e.g., empty input), create one empty card
    if (cards.length === 0) {
        cards.push({ id: nanoid(), text: '' })
    }

    return cards
}
