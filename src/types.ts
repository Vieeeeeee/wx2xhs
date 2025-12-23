export type Card = {
    id: string
    text: string
    startOffset: number  // Position in original text for scroll positioning
}

export type Project = {
    originalText: string
    cards: Card[]
}
