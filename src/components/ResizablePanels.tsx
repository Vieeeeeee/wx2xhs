import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

interface ResizablePanelsProps {
    leftPanel: ReactNode
    middlePanel: ReactNode
    rightPanel: ReactNode
    leftTitle?: string
    middleTitle?: string
    rightTitle?: string
    defaultLeftWidth?: number  // percentage
    defaultMiddleWidth?: number // percentage
    minWidth?: number // pixels - below this, panel collapses
}

export function ResizablePanels({
    leftPanel,
    middlePanel,
    rightPanel,
    leftTitle = '左栏',
    middleTitle = '中栏',
    rightTitle = '右栏',
    defaultLeftWidth = 30,
    defaultMiddleWidth = 25,
    minWidth = 80, // collapse threshold in pixels
}: ResizablePanelsProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
    const [middleWidth, setMiddleWidth] = useState(defaultMiddleWidth)
    const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null)
    const [collapsedPanels, setCollapsedPanels] = useState<Set<'left' | 'middle' | 'right'>>(new Set())

    // Get actual pixel width of container
    const getContainerWidth = useCallback(() => {
        return containerRef.current?.offsetWidth || 1000
    }, [])

    const recalculateCollapsedPanels = useCallback((nextLeftWidth: number, nextMiddleWidth: number) => {
        const containerWidth = getContainerWidth()
        const nextRightWidth = 100 - nextLeftWidth - nextMiddleWidth
        const next = new Set<'left' | 'middle' | 'right'>()

        if ((nextLeftWidth / 100) * containerWidth < minWidth) next.add('left')
        if ((nextMiddleWidth / 100) * containerWidth < minWidth) next.add('middle')
        if ((nextRightWidth / 100) * containerWidth < minWidth) next.add('right')

        setCollapsedPanels(next)
    }, [getContainerWidth, minWidth])

    const handleMouseDown = useCallback((handle: 'left' | 'right') => {
        setIsDragging(handle)
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = (x / rect.width) * 100

        if (isDragging === 'left') {
            // Dragging left handle - adjust left panel width
            // Left panel can go from 5% to 85%
            const newLeftWidth = Math.max(5, Math.min(85, percentage))
            // Ensure middle + right still have space (at least 10% each)
            const adjustedLeftWidth = Math.min(newLeftWidth, 100 - middleWidth - 5)
            setLeftWidth(adjustedLeftWidth)
            recalculateCollapsedPanels(adjustedLeftWidth, middleWidth)
        } else if (isDragging === 'right') {
            // Dragging right handle - adjust middle panel width
            // Middle panel width = cursor position - left panel width
            const newMiddleWidth = percentage - leftWidth
            // Clamp: min 5%, max = remaining space minus 5% for right panel
            const clampedMiddleWidth = Math.max(5, Math.min(95 - leftWidth, newMiddleWidth))
            setMiddleWidth(clampedMiddleWidth)
            recalculateCollapsedPanels(leftWidth, clampedMiddleWidth)
        }
    }, [isDragging, leftWidth, middleWidth, recalculateCollapsedPanels])

    const handleMouseUp = useCallback(() => {
        setIsDragging(null)
    }, [])

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    // Toggle collapsed panel
    const togglePanel = useCallback((panel: 'left' | 'middle' | 'right') => {
        if (panel === 'left') {
            const nextLeftWidth = leftWidth < 10 ? defaultLeftWidth : 5
            setLeftWidth(nextLeftWidth)
            recalculateCollapsedPanels(nextLeftWidth, middleWidth)
        } else if (panel === 'middle') {
            const nextMiddleWidth = middleWidth < 10 ? defaultMiddleWidth : 5
            setMiddleWidth(nextMiddleWidth)
            recalculateCollapsedPanels(leftWidth, nextMiddleWidth)
        } else {
            // Right panel - adjust both left and middle to give space
            const currentRight = 100 - leftWidth - middleWidth
            if (currentRight < 10) {
                setLeftWidth(defaultLeftWidth)
                setMiddleWidth(defaultMiddleWidth)
                recalculateCollapsedPanels(defaultLeftWidth, defaultMiddleWidth)
            } else {
                const nextMiddleWidth = 100 - leftWidth - 5
                setMiddleWidth(nextMiddleWidth)
                recalculateCollapsedPanels(leftWidth, nextMiddleWidth)
            }
        }
    }, [leftWidth, middleWidth, defaultLeftWidth, defaultMiddleWidth, recalculateCollapsedPanels])

    const isCollapsed = (panel: 'left' | 'middle' | 'right') => collapsedPanels.has(panel)

    return (
        <div ref={containerRef} className="flex-1 flex min-h-0 min-w-0 relative">
            {/* Left Panel */}
            <div
                className={`flex flex-col min-h-0 min-w-0 border-r border-stone-200 bg-white ${isDragging ? '' : 'transition-all duration-200'} ${isCollapsed('left') ? 'overflow-hidden' : ''
                    }`}
                style={{ width: `${leftWidth}%` }}
            >
                {isCollapsed('left') ? (
                    <button
                        onClick={() => togglePanel('left')}
                        className="h-full w-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                        title={leftTitle}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                ) : (
                    leftPanel
                )}
            </div>

            {/* Left Resize Handle */}
            <div
                className={`w-1 cursor-col-resize hover:bg-stone-300 transition-colors shrink-0 ${isDragging === 'left' ? 'bg-stone-400' : 'bg-transparent'
                    }`}
                onMouseDown={() => handleMouseDown('left')}
            />

            {/* Middle Panel */}
            <div
                className={`flex flex-col min-h-0 min-w-0 border-r border-stone-200 bg-stone-50 ${isDragging ? '' : 'transition-all duration-200'} ${isCollapsed('middle') ? 'overflow-hidden' : ''
                    }`}
                style={{ width: `${middleWidth}%` }}
            >
                {isCollapsed('middle') ? (
                    <button
                        onClick={() => togglePanel('middle')}
                        className="h-full w-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                        title={middleTitle}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                ) : (
                    middlePanel
                )}
            </div>

            {/* Right Resize Handle */}
            <div
                className={`w-1 cursor-col-resize hover:bg-stone-300 transition-colors shrink-0 ${isDragging === 'right' ? 'bg-stone-400' : 'bg-transparent'
                    }`}
                onMouseDown={() => handleMouseDown('right')}
            />

            {/* Right Panel */}
            <div
                className={`flex-1 flex flex-col min-h-0 min-w-0 bg-stone-100 ${isDragging ? '' : 'transition-all duration-200'} ${isCollapsed('right') ? 'overflow-hidden' : ''
                    }`}
            >
                {isCollapsed('right') ? (
                    <button
                        onClick={() => togglePanel('right')}
                        className="h-full w-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                        title={rightTitle}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                ) : (
                    rightPanel
                )}
            </div>
        </div>
    )
}
