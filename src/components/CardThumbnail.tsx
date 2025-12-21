import type { Card } from '../types'

interface CardThumbnailProps {
    card: Card
    index: number
    isSelected: boolean
    onClick: () => void
}

export function CardThumbnail({ card, index, isSelected, onClick }: CardThumbnailProps) {
    // Get first 2 lines or first 60 chars for thumbnail
    const getPreviewText = (text: string) => {
        const lines = text.split('\n').slice(0, 2)
        const preview = lines.join('\n')
        return preview.length > 60 ? preview.slice(0, 60) + '...' : preview
    }

    return (
        <div
            onClick={onClick}
            className={`
        p-3 rounded-lg cursor-pointer transition-all duration-200
        border-2
        ${isSelected
                    ? 'border-stone-800 bg-stone-100 shadow-md'
                    : 'border-transparent bg-white hover:border-stone-300 hover:shadow-sm'
                }
      `}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-stone-500">#{index + 1}</span>
                <span className="text-xs text-stone-400">
                    {card.text.replace(/\s/g, '').length} 字
                </span>
            </div>
            <div className="text-sm text-stone-700 line-clamp-2 leading-relaxed">
                {getPreviewText(card.text)}
            </div>
        </div>
    )
}
