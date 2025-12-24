import { useRef, useCallback, useState, useEffect } from 'react'
import type { Card } from './types'
import { splitToCards, recalculatePageBreaks, type Typography } from './utils/splitToCards'
import { exportCards } from './utils/exportCards'
import { CardThumbnail } from './components/CardThumbnail'
import { CardPreview, type BackgroundStyle } from './components/CardPreview'
import { RichTextInput, type RichTextInputHandle } from './components/RichTextInput'
import { ResizablePanels } from './components/ResizablePanels'

const STORAGE_KEY = 'wx2xhs-draft'

// Load saved state from localStorage
function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e)
  }
  return null
}

function App() {
  const savedState = loadSavedState()

  const [originalText, setOriginalText] = useState(savedState?.originalText ?? '')
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [images, setImages] = useState<Map<string, string>>(new Map())
  const [imageMeta, setImageMeta] = useState<Map<string, { width: number; height: number }>>(new Map())
  const [imageSizes, setImageSizes] = useState<Map<string, number>>(new Map()) // image ID -> width percentage (20-100)
  const [typography, setTypography] = useState<Typography>(savedState?.typography ?? { fontSize: 32, lineHeight: 1.6, paragraphSpacing: 1.2, letterSpacing: 0.05 })
  const [isAutoMode, setIsAutoMode] = useState(false) // Auto mode: typography changes update --- positions
  const [previewScale, setPreviewScale] = useState(1.1) // zoom multiplier on top of "fit to viewport"
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(savedState?.backgroundStyle ?? 'classic')
  const textInputRef = useRef<RichTextInputHandle>(null)
  const cardsRef = useRef<Card[]>([])
  const selectedCardIdRef = useRef<string | null>(null)
  const isEditingCardRef = useRef(false) // Prevent regeneration during card editing
  const previewViewportRef = useRef<HTMLDivElement>(null)
  const [previewViewportSize, setPreviewViewportSize] = useState<{ width: number; height: number } | null>(null)

  cardsRef.current = cards
  selectedCardIdRef.current = selectedCardId

  // Save state to localStorage when it changes
  useEffect(() => {
    const stateToSave = {
      originalText,
      typography,
      backgroundStyle,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (e) {
      console.warn('Failed to save state:', e)
    }
  }, [originalText, typography, backgroundStyle])

  // Regenerate cards when originalText changes (simple split by ---)
  useEffect(() => {
    // Skip regeneration during card editing to preserve focus
    if (isEditingCardRef.current) {
      isEditingCardRef.current = false
      return
    }

    if (!originalText.trim()) {
      setCards([])
      setSelectedCardId(null)
      return
    }
    const timeout = setTimeout(() => {
      const currentIndex = cardsRef.current.findIndex(c => c.id === selectedCardIdRef.current)
      const newCards = splitToCards(originalText)
      setCards(newCards)
      if (newCards.length > 0) {
        const newIndex = currentIndex >= 0 ? Math.min(currentIndex, newCards.length - 1) : 0
        setSelectedCardId(newCards[newIndex].id)
      } else {
        setSelectedCardId(null)
      }
    }, 200)
    return () => clearTimeout(timeout)
  }, [originalText])

  // Auto-mode: When typography changes, recalculate --- positions in text
  useEffect(() => {
    if (!isAutoMode) return
    if (!originalText.trim()) return

    const timeout = setTimeout(() => {
      const newText = recalculatePageBreaks(originalText, typography, imageMeta)
      if (newText !== originalText) {
        setOriginalText(newText)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [isAutoMode, typography, imageMeta, originalText])

  const selectedCard = cards.find(c => c.id === selectedCardId)

  useEffect(() => {
    const element = previewViewportRef.current
    if (!element) {
      setPreviewViewportSize(null)
      return
    }

    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setPreviewViewportSize({ width: rect.width, height: rect.height })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [selectedCardId])

  // "生成分页" - Insert --- markers into text
  const handleGenerate = useCallback(() => {
    if (!originalText.trim()) return
    // Calculate and insert page breaks
    const newText = recalculatePageBreaks(originalText, typography, imageMeta)
    setOriginalText(newText)
    setIsAutoMode(true) // Enable auto mode after generating
  }, [originalText, typography, imageMeta])

  // "重新分页" - Recalculate --- positions
  const handleReset = useCallback(() => {
    const newText = recalculatePageBreaks(originalText, typography, imageMeta)
    setOriginalText(newText)
    setIsAutoMode(true)
  }, [originalText, typography, imageMeta])

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

    // Find the next card to determine end position
    const cardIndex = cards.findIndex(c => c.id === card.id)
    const nextCard = cards[cardIndex + 1]
    const endPos = nextCard ? nextCard.startOffset : originalText.length
    const cardTextLength = endPos - card.startOffset

    // Scroll to card position and select entire card text
    textInputRef.current?.scrollToPosition(card.startOffset, cardTextLength)
  }

  const handleImageAdd = useCallback((id: string, base64: string) => {
    setImages(prev => new Map(prev).set(id, base64))

    const img = new Image()
    img.onload = () => {
      setImageMeta(prev => new Map(prev).set(id, { width: img.naturalWidth, height: img.naturalHeight }))
    }
    img.src = base64
  }, [])

  const handleImageRemove = useCallback((id: string) => {
    setImages(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
    setImageMeta(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
    setImageSizes(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [])

  const handleImageResize = useCallback((id: string, widthPercent: number) => {
    setImageSizes(prev => new Map(prev).set(id, Math.min(100, Math.max(20, widthPercent))))
  }, [])

  // Handle card text changes from inline editing
  const handleCardTextChange = useCallback((cardId: string, newText: string) => {
    const cardIndex = cards.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return

    // Set flag to prevent regeneration during editing
    isEditingCardRef.current = true

    // Split text by --- and rebuild with updated card content
    const parts: string[] = []
    const delimiterRegex = /^[ \t]*---[ \t]*$/gm
    let lastIndex = 0
    let partIndex = 0
    let match: RegExpExecArray | null

    while ((match = delimiterRegex.exec(originalText)) !== null) {
      const content = originalText.slice(lastIndex, match.index).trim()
      if (content) {
        // If this is the card being edited, use newText
        parts.push(partIndex === cardIndex ? newText : content)
        partIndex++
      }
      lastIndex = match.index + match[0].length
      // Skip trailing newline after ---
      if (originalText[lastIndex] === '\n') lastIndex++
    }

    // Add remaining content
    const remaining = originalText.slice(lastIndex).trim()
    if (remaining) {
      parts.push(partIndex === cardIndex ? newText : remaining)
    }

    // Rebuild text with --- between parts
    const newOriginalText = parts.join('\n\n---\n\n')
    setOriginalText(newOriginalText)

    // Directly update the card text (preserves card id and component state)
    setCards(prevCards => prevCards.map(c =>
      c.id === cardId ? { ...c, text: newText } : c
    ))
  }, [cards, originalText])

  const fitScale = (() => {
    const baseWidth = 1080
    const baseHeight = 1440
    const padding = 24 // match preview viewport padding (p-6)
    if (!previewViewportSize) return 0.3

    const availableWidth = Math.max(0, previewViewportSize.width - padding * 2)
    const availableHeight = Math.max(0, previewViewportSize.height - padding * 2)
    if (availableWidth === 0 || availableHeight === 0) return 0.3

    return Math.min(1, availableWidth / baseWidth, availableHeight / baseHeight)
  })()

  const effectivePreviewScale = fitScale * previewScale

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200 px-6 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800 tracking-wide">
          「文字」转「图文笔记」神器
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

      {/* Main Content - Resizable Panels */}
      <ResizablePanels
        defaultLeftWidth={30}
        defaultMiddleWidth={25}
        minWidth={100}
        leftTitle="原文输入"
        middleTitle="卡片列表"
        rightTitle="预览"
        leftPanel={
          <div className="p-4 flex flex-col h-full">
            <RichTextInput
              ref={textInputRef}
              value={originalText}
              onChange={setOriginalText}
              onImageAdd={handleImageAdd}
              onImageRemove={handleImageRemove}
              images={images}
              placeholder="在此粘贴文章全文...

支持格式标记：
**粗体** → 粗体
==高亮== → 高亮
---      → 手动强制分页（独占一行）"
              className="flex-1 min-h-0"
            />
            <div className="shrink-0 mt-4 flex items-center gap-3">
              <button
                onClick={cards.length > 0 ? handleReset : handleGenerate}
                disabled={!originalText.trim()}
                className="flex-1 py-3 text-sm font-medium text-white bg-stone-800 rounded-lg
                           hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                {cards.length > 0 ? '重新分页' : '生成分页'}
              </button>
              <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none" title="开启后，调整字号/行间距会自动重算分页位置">
                <input
                  type="checkbox"
                  checked={isAutoMode}
                  onChange={(e) => setIsAutoMode(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
                />
                自动
              </label>
            </div>
          </div>
        }
        middlePanel={
          <div className="p-4 flex flex-col h-full relative z-20">
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
                      onTextChange={handleCardTextChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        }
        rightPanel={
          <div className="p-6 flex flex-col h-full">
            {/* Typography Controls */}
            <div className="shrink-0 mb-2 px-2 py-1.5 bg-white rounded-md border border-stone-200 flex items-center justify-between text-xs relative z-30">
              <div className="flex items-center gap-1">
                <span className="text-stone-500">字号:</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, fontSize: Math.max(20, t.fontSize - 2) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >-</button>
                <span className="w-6 text-center">{typography.fontSize}</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, fontSize: Math.min(60, t.fontSize + 2) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >+</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-stone-500">行间距:</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, lineHeight: Math.max(1.2, +(t.lineHeight - 0.1).toFixed(1)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >-</button>
                <span className="w-6 text-center">{typography.lineHeight}</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, lineHeight: Math.min(2.5, +(t.lineHeight + 0.1).toFixed(1)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >+</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-stone-500">段距:</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, paragraphSpacing: Math.max(0.5, +(t.paragraphSpacing - 0.1).toFixed(1)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >-</button>
                <span className="w-6 text-center">{typography.paragraphSpacing}</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, paragraphSpacing: Math.min(3, +(t.paragraphSpacing + 0.1).toFixed(1)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >+</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-stone-500">字距:</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, letterSpacing: Math.max(0, +((t.letterSpacing ?? 0.05) - 0.01).toFixed(2)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >-</button>
                <span className="w-6 text-center">{(typography.letterSpacing ?? 0.05).toFixed(2)}</span>
                <button
                  onClick={() => setTypography(t => ({ ...t, letterSpacing: Math.min(0.12, +((t.letterSpacing ?? 0.05) + 0.01).toFixed(2)) }))}
                  className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200"
                >+</button>
              </div>
            </div>
            {/* Preview Area with Background Selector */}
            <div className="flex-1 min-h-0 min-w-0 flex gap-3">
              {/* Card Preview Section */}
              {selectedCard ? (
                <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                  {/* Card Preview with Navigation */}
                  <div className="flex-1 flex items-stretch min-h-0 min-w-0 relative">
                    {/* Left Arrow */}
                    <button
                      onClick={() => {
                        const idx = cards.findIndex(c => c.id === selectedCardId)
                        if (idx > 0) setSelectedCardId(cards[idx - 1].id)
                      }}
                      disabled={cards.findIndex(c => c.id === selectedCardId) === 0}
                      className="absolute left-0 top-0 bottom-0 w-12 z-10
                                 flex items-center justify-center
                                 bg-stone-100/30 hover:bg-stone-200/60
                                 disabled:opacity-0 disabled:cursor-not-allowed transition-all
                                 group"
                    >
                      <span className="text-lg text-stone-300 group-hover:text-stone-500 transition-colors">‹</span>
                    </button>

                    {/* Card Preview */}
                    <div
                      ref={previewViewportRef}
                      className="flex-1 min-h-0 min-w-0 overflow-auto p-6 bg-white/60 rounded-lg border border-stone-200"
                    >
                      <div className="min-h-full min-w-full flex items-center justify-center">
                        <CardPreview
                          card={selectedCard}
                          images={images}
                          imageSizes={imageSizes}
                          onImageResize={handleImageResize}
                          typography={typography}
                          backgroundStyle={backgroundStyle}
                          displayScale={effectivePreviewScale}
                        />
                      </div>
                    </div>

                    {/* Right Arrow */}
                    <button
                      onClick={() => {
                        const idx = cards.findIndex(c => c.id === selectedCardId)
                        if (idx < cards.length - 1) setSelectedCardId(cards[idx + 1].id)
                      }}
                      disabled={cards.findIndex(c => c.id === selectedCardId) === cards.length - 1}
                      className="absolute right-0 top-0 bottom-0 w-12 z-10
                                 flex items-center justify-center
                                 bg-stone-100/30 hover:bg-stone-200/60
                                 disabled:opacity-0 disabled:cursor-not-allowed transition-all
                                 group"
                    >
                      <span className="text-lg text-stone-300 group-hover:text-stone-500 transition-colors">›</span>
                    </button>
                  </div>

                  {/* Card Counter + Zoom Controls */}
                  <div className="shrink-0 flex items-center justify-center gap-4 py-1 relative z-20">
                    <div className="text-xs text-stone-400">
                      {cards.findIndex(c => c.id === selectedCardId) + 1} / {cards.length}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setPreviewScale(s => Math.max(0.5, +(s - 0.05).toFixed(2)))}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-base cursor-pointer"
                      >−</button>
                      <span className="w-12 text-center text-stone-500">{(effectivePreviewScale * 100).toFixed(0)}%</span>
                      <button
                        onClick={() => setPreviewScale(s => Math.min(2, +(s + 0.05).toFixed(2)))}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-base cursor-pointer"
                      >+</button>
                      <button
                        onClick={() => setPreviewScale(1)}
                        className="px-2 h-7 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600"
                        title="适应窗口"
                      >
                        适应
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  <div className="shrink-0 min-w-0 py-2 bg-white rounded-lg border border-stone-200 overflow-x-auto overflow-y-hidden relative z-20">
                    <div className="flex gap-1.5 px-4 w-max">
                      {cards.map((card, index) => {
                        const previewText = card.text.replace(/[[\]#*=_]/g, '').trim().slice(0, 20)
                        return (
                          <button
                            key={card.id}
                            onClick={() => setSelectedCardId(card.id)}
                            className={`shrink-0 w-12 h-16 rounded border transition-all flex flex-col items-center justify-between p-1 overflow-hidden
                              ${card.id === selectedCardId
                                ? 'border-stone-800 bg-stone-50 shadow'
                                : 'border-stone-200 bg-white hover:border-stone-400'
                              }`}
                          >
                            <div className="w-full flex-1 text-[5px] leading-[1.3] text-stone-500 text-left overflow-hidden break-all">
                              {previewText || '空'}
                            </div>
                            <div className="text-[8px] font-medium text-stone-400 mt-0.5">{index + 1}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                  <div
                    ref={previewViewportRef}
                    className="flex-1 min-h-0 min-w-0 overflow-auto p-6 bg-white/60 rounded-lg border border-stone-200 flex items-center justify-center"
                  >
                    <div className="text-stone-400 text-center">
                      <div className="text-lg mb-2">📄</div>
                      <div>选择一张卡片查看预览</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Background Style Selector */}
              <div className="shrink-0 w-16 flex flex-col gap-2 py-2 relative z-30">
                <div className="text-xs text-stone-400 text-center mb-1">背景</div>
                {(['classic', 'grid', 'paper', 'grain'] as BackgroundStyle[]).map(style => (
                  <button
                    key={style}
                    onClick={() => setBackgroundStyle(style)}
                    className={`w-full py-2 rounded-lg text-xs transition-all cursor-pointer ${backgroundStyle === style
                      ? 'bg-stone-800 text-white shadow-md'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                  >
                    {style === 'classic' ? '经典' : style === 'grid' ? '网格' : style === 'paper' ? '纸感' : '冷白'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />

      {/* Hidden export containers */}
      <div style={{ position: 'absolute', visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        {cards.map(card => (
          <CardPreview key={card.id} card={card} images={images} imageSizes={imageSizes} typography={typography} backgroundStyle={backgroundStyle} forExport />
        ))}
      </div>
    </div>
  )
}

export default App
