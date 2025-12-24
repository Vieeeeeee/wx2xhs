import html2canvas from 'html2canvas'
import JSZip from 'jszip'

async function nextFrame(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
}

async function waitForFonts(timeoutMs = 3000): Promise<void> {
    const fonts = document.fonts
    if (!fonts?.ready) return

    await Promise.race([
        fonts.ready.then(() => undefined),
        new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
    ])
}

async function waitForImages(root: HTMLElement, timeoutMs = 5000): Promise<void> {
    const imgs = Array.from(root.querySelectorAll('img'))
    if (imgs.length === 0) return

    const waitOne = (img: HTMLImageElement) => new Promise<void>(resolve => {
        if (img.complete && img.naturalWidth > 0) return resolve()

        // decode() is more reliable when available
        if (typeof img.decode === 'function') {
            img.decode().then(() => resolve(), () => resolve())
            return
        }

        const cleanup = () => {
            img.removeEventListener('load', onDone)
            img.removeEventListener('error', onDone)
        }
        const onDone = () => {
            cleanup()
            resolve()
        }

        img.addEventListener('load', onDone, { once: true })
        img.addEventListener('error', onDone, { once: true })
    })

    await Promise.race([
        Promise.all(imgs.map(waitOne)).then(() => undefined),
        new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
    ])
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Failed to encode PNG')
    return blob
}

/**
 * Export all card elements as PNG images bundled in a zip file
 * @param cardIds - Array of card IDs to export
 */
export async function exportCards(cardIds: string[]): Promise<void> {
    const zip = new JSZip()
    const folder = zip.folder('cards')

    let container: HTMLDivElement | null = null
    try {
        await waitForFonts()

        // Render clones in a stable, on-screen coordinate space to avoid html2canvas
        // issues with off-screen (negative) coordinates.
        container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.top = '0'
        container.style.left = '0'
        container.style.width = '0'
        container.style.height = '0'
        container.style.overflow = 'visible'
        container.style.pointerEvents = 'none'
        container.style.zIndex = '-1'
        document.body.appendChild(container)

        for (let i = 0; i < cardIds.length; i++) {
            const cardId = cardIds[i]
            const element = document.getElementById(`card-export-${cardId}`)

            if (!element) {
                console.warn(`Card element not found: card-export-${cardId}`)
                continue
            }

            try {
                const clone = element.cloneNode(true) as HTMLElement
                clone.style.position = 'absolute'
                clone.style.top = '0'
                clone.style.left = '0'
                clone.style.margin = '0'
                clone.style.transform = 'none'
                container.appendChild(clone)

                // Give the browser a moment to layout, and ensure images are decoded.
                await nextFrame(2)
                await waitForImages(clone)
                await nextFrame(1)

                const width = clone.offsetWidth || 1080
                const height = clone.offsetHeight || 1440

                const canvas = await html2canvas(clone, {
                    scale: 2, // 2x resolution for high-quality export
                    useCORS: true,
                    foreignObjectRendering: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width,
                    height,
                    windowWidth: width,
                    windowHeight: height,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                })

                const fileName = `card_${String(i + 1).padStart(2, '0')}.png`
                const pngBlob = await canvasToBlob(canvas)
                if (folder) {
                    folder.file(fileName, pngBlob)
                } else {
                    zip.file(fileName, pngBlob)
                }
            } catch (error) {
                console.error(`Failed to capture card ${cardId}:`, error)
            } finally {
                // Clean up clone if it was appended
                while (container.firstChild) container.removeChild(container.firstChild)
            }
        }

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

        setTimeout(() => URL.revokeObjectURL(url), 1000)

    } catch (error) {
        console.error('Export failed:', error)
        alert('导出失败，请重试')
    } finally {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container)
        }
    }
}
