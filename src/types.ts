export type Card = {
    id: string
    text: string
}

export type Project = {
    originalText: string
    cards: Card[]
}
