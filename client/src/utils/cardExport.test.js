import { captureCardCanvas, exportCardAsImage, exportCardAsPdf } from './cardExport'

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      width: 1620,
      height: 2160,
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
    })
  })
})

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }))
})

describe('cardExport utility', () => {
  let mockElement

  beforeEach(() => {
    mockElement = document.createElement('div')
    mockElement.id = 'test-card-target'
    mockElement.style.width = '540px'
    mockElement.style.height = '720px'
    document.body.appendChild(mockElement)

    // Mock getBoundingClientRect
    mockElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 100,
      left: 200,
      width: 540,
      height: 720,
    })
  })

  afterEach(() => {
    if (mockElement && mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement)
    }
  })

  it('throws an error if target element is missing', async () => {
    await expect(captureCardCanvas(null)).rejects.toThrow('Target card element was not found.')
  })

  it('captures canvas with correct element dimensions', async () => {
    const canvas = await captureCardCanvas(mockElement)
    expect(canvas).toBeDefined()
    expect(canvas.width).toBe(1620)
    expect(canvas.height).toBe(2160)
  })

  it('exports card as PNG successfully', async () => {
    const result = await exportCardAsImage(mockElement, {
      filename: 'test_card.png',
      format: 'png',
    })
    expect(result.filename).toBe('test_card.png')
    expect(result.width).toBe(1620)
  })

  it('exports card as PDF successfully', async () => {
    const result = await exportCardAsPdf(mockElement, {
      filename: 'test_card.pdf',
    })
    expect(result.filename).toBe('test_card.pdf')
    expect(result.pdfWidth).toBe(540)
  })
})
