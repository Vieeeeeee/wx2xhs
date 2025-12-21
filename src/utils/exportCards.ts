import html2canvas from 'html2canvas'
import JSZip from 'jszip'

/**
 * Export all card elements as PNG images bundled in a zip file
 * @param cardIds - Array of card IDs to export
 */
export async function exportCards(cardIds: string[]): Promise<void> {
    const zip = new JSZip()
    const folder = zip.folder('cards') // Create a subfolder for better organization

    // Create a temporary container for cloning elements into view
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.zIndex = '-9999' // Behind everything
    // opacity removed to prevent html2canvas transparent capture

    // Important: html2canvas needs the element to be visible in DOM.
    // We rely on z-index being behind strict background to hide it from user.
    // Place it off-screen BUT within a rendered context?
    // Let's use top: 0, left: 0 but obscured.
    document.body.appendChild(container)

    try {
        for (let i = 0; i < cardIds.length; i++) {
            const cardId = cardIds[i]
            const originalElement = document.getElementById(`card-export-${cardId}`)

            if (!originalElement) {
                console.warn(`Card element not found: card-export-${cardId}`)
                continue
            }

            // Clone the element to bring it into a clean capturing context
            const clone = originalElement.cloneNode(true) as HTMLElement
            // Ensure clone has explicit dimensions and background if not set by class
            clone.style.margin = '0'
            clone.style.transform = 'none'

            // Append to our fixed container
            container.appendChild(clone)

            try {
                // Capture
                const canvas = await html2canvas(clone, {
                    scale: 1, // 1080x1920
                    useCORS: true,
                    backgroundColor: '#ffffff', // Force white background
                    logging: false,
                    // Fix potential scroll issues
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: document.documentElement.clientWidth,
                    windowHeight: document.documentElement.clientHeight
                })

                // Convert to dataUrl (returns "data:image/png;base64,...")
                const dataUrl = canvas.toDataURL('image/png', 1.0)
                const base64Data = dataUrl.split(',')[1]

                const fileName = `card_${String(i + 1).padStart(2, '0')}.png`
                // Add to zip (if folder exists, use it, else root)
                if (folder) {
                    folder.file(fileName, base64Data, { base64: true })
                } else {
                    zip.file(fileName, base64Data, { base64: true })
                }

            } catch (error) {
                console.error(`Failed to capture card ${cardId}:`, error)
            } finally {
                // Clean up clone
                container.removeChild(clone)
            }
        }

        // Generate and download zip
        // Generate blob
        const zipBlob = await zip.generateAsync({ type: 'blob' })

        if (zipBlob.size === 0) {
            alert('Export failed: Empty ZIP file generated.')
            return
        }

        const url = URL.createObjectURL(zipBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `wx2xhs_cards_${new Date().toISOString().slice(0, 10)}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Cleanup URL after a small delay
        setTimeout(() => URL.revokeObjectURL(url), 1000)

    } finally {
        // Remove container
        document.body.removeChild(container)
    }
}
