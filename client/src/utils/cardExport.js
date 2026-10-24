/**
 * Card Export Utility
 * Bulletproof html2canvas and jsPDF export for D.Narai Travel and Weather Cards.
 * Fixes all misalignment, scrolling offset, font clipping, and dimensions issues.
 */

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Prepares and captures an HTML element into a pixel-perfect canvas.
 */
export async function captureCardCanvas(element, { scale = 2, backgroundColor = '#FAF8F4' } = {}) {
  if (!element) {
    throw new Error('Target card element was not found.')
  }

  // 1. Ensure all fonts in document are fully loaded and ready
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch {
      // Continue if fonts API fails
    }
  }

  // 2. Short settling delay to allow layout and SVGs to stabilize
  await new Promise((resolve) => setTimeout(resolve, 150))

  // 3. Capture using html2canvas directly targeting the element
  // DO NOT supply manual x/y or windowWidth overrides: html2canvas natively measures
  // the element bounds in the cloned document. Setting scrollX/scrollY to 0 prevents scroll shifts.
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: backgroundColor || '#FAF8F4',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.getElementById(element.id)
      if (clonedEl) {
        clonedEl.style.transform = 'none'
        clonedEl.style.webkitTransform = 'none'
        clonedEl.style.transition = 'none'
      }
    },
  })

  return canvas
}

/**
 * Exports a card element as high-resolution PNG or JPEG image.
 */
export async function exportCardAsImage(
  element,
  { filename = 'DNARAI_Card.png', format = 'png', scale = 2, backgroundColor = '#FAF8F4' } = {}
) {
  const canvas = await captureCardCanvas(element, { scale, backgroundColor })
  const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png'
  const dataUrl = canvas.toDataURL(mimeType, 0.98)

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return { filename, width: canvas.width, height: canvas.height }
}

/**
 * Exports a card element as a clean, perfectly aligned PDF document.
 */
export async function exportCardAsPdf(
  element,
  { filename = 'DNARAI_Card.pdf', scale = 2, backgroundColor = '#FAF8F4' } = {}
) {
  const canvas = await captureCardCanvas(element, { scale, backgroundColor })
  const imgData = canvas.toDataURL('image/png', 1.0)

  // Standard card width in pt (approx 540px / 72 * 72)
  const pdfWidth = 540
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  // Initialize jsPDF with exact matching dimensions to prevent page clipping or white margins
  const pdf = new jsPDF({
    orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
    unit: 'pt',
    format: [pdfWidth, pdfHeight],
  })

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST')
  pdf.save(filename)

  return { filename, pdfWidth, pdfHeight }
}
