import { useRef, useCallback, useState } from 'react'
import type { Card } from './types'
import { splitToCards } from './utils/splitToCards'
import { exportCards } from './utils/exportCards'
import { CardThumbnail } from './components/CardThumbnail'
import { CardPreview } from './components/CardPreview'
import { RichTextInput, type RichTextInputHandle } from './components/RichTextInput'

function App() {
  const [originalText, setOriginalText] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const textInputRef = useRef<RichTextInputHandle>(null)

  const selectedCard = cards.find(c => c.id === selectedCardId)

  const handleGenerate = useCallback(() => {
    if (!originalText.trim()) return
    const newCards = splitToCards(originalText)
    setCards(newCards)
    if (newCards.length > 0) {
      setSelectedCardId(newCards[0].id)
    }
  }, [originalText])

  const handleReset = useCallback(() => {
    // Find current selection index before regenerating
    const currentIndex = cards.findIndex(c => c.id === selectedCardId)

    const newCards = splitToCards(originalText)
    setCards(newCards)

    // Preserve selection by index (or keep at same position if possible)
    if (currentIndex >= 0 && newCards.length > 0) {
      const newIndex = Math.min(currentIndex, newCards.length - 1)
      setSelectedCardId(newCards[newIndex].id)
    }
  }, [originalText, selectedCardId, cards])

  const handleExport = useCallback(async () => {
    if (cards.length === 0) return
    setIsExporting(true)
    try {
      await exportCards(cards.map(c => c.id))
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [cards])

  const handleCardClick = (card: Card) => {
    setSelectedCardId(card.id)
    // Find the starting text of the card and scroll to it in the input (Sync)
    // Take a snippet to search
    const snippet = card.text.trim().substring(0, 20)
    textInputRef.current?.scrollToText(snippet)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-800 tracking-wide">
          WX2XHS MVP
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={cards.length === 0 || isExporting}
            className="px-4 py-2 text-sm text-white bg-stone-800 rounded-lg
                       hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isExporting ? '导出中...' : '导出图片'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Column - Input with Formatting Toolbar */}
        <div className="w-[30%] border-r border-stone-200 bg-white p-4 flex flex-col">
          <label className="shrink-0 text-sm font-medium text-stone-600 mb-2">
            原文输入
          </label>
          <RichTextInput
            ref={textInputRef}
            value={originalText}
            onChange={setOriginalText}
            placeholder="在此粘贴文章全文...

支持格式标记：
**粗体** → 粗体
==高亮== → 高亮
---      → 手动强制分页（独占一行）"
            className="flex-1 min-h-0"
          />
          <button
            onClick={cards.length > 0 ? handleReset : handleGenerate}
            disabled={!originalText.trim()}
            className="shrink-0 mt-4 py-3 text-sm font-medium text-white bg-stone-800 rounded-lg
                       hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {cards.length > 0 ? '重新分页' : '生成分页'}
          </button>
        </div>

        {/* Middle Column - Card List */}
        <div className="w-[25%] border-r border-stone-200 bg-stone-50 p-4 flex flex-col min-h-0">
          <div className="shrink-0 text-sm font-medium text-stone-600 mb-3">
            卡片列表 {cards.length > 0 && `(${cards.length})`}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {cards.length === 0 ? (
              <div className="text-sm text-stone-400 text-center py-10">
                点击「生成分页」生成卡片
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map((card, index) => (
                  <CardThumbnail
                    key={card.id}
                    card={card}
                    index={index}
                    isSelected={card.id === selectedCardId}
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Preview Only */}
        <div className="w-[45%] bg-stone-100 p-6 flex flex-col min-h-0">
          {selectedCard ? (
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center">
              <div className="shrink-0 text-sm font-medium text-stone-600 mb-4 self-start">
                卡片预览
              </div>
              <div className="flex-1 flex items-center justify-center">
                <CardPreview card={selectedCard} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-stone-400 text-center">
                <div className="text-lg mb-2">📄</div>
                <div>选择一张卡片查看预览</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden export containers */}
      <div className="absolute left-[-9999px] top-0">
        {cards.map(card => (
          <CardPreview key={card.id} card={card} forExport />
        ))}
      </div>
    </div>
  )
}

export default App

