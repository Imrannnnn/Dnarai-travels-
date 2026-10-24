import { parseClothingAdviceList } from '../../utils/weatherCardService'

describe('parseClothingAdviceList', () => {
  it('returns default structured advice when empty', () => {
    const list = parseClothingAdviceList('')
    expect(list).toHaveLength(3)
    expect(list[0].title).toBe('Daytime Wear')
    expect(list[1].title).toBe('Evening & AC Comfort')
    expect(list[2].title).toBe('Weather & Sun Protection')
  })

  it('splits multi-clause advice paragraphs into clean list items', () => {
    const text =
      'Wear loose, lightweight, breathable fabrics for the daytime heat, carry a packable rain layer for afternoon storms, and keep a light jacket for chilly indoor AC and cooler evening lows.'
    const list = parseClothingAdviceList(text)

    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].title).toBe('Daytime Wear')
    expect(list[0].text).toContain('Wear loose, lightweight')
    expect(list[1].title).toBe('Evening & AC Comfort')
    expect(list[1].text).toContain('Keep a light jacket')
  })

  it('handles explicit bullet points or newlines', () => {
    const text = `• Lightweight breathable cotton shirts
• Compact travel umbrella for sudden showers
• Light cardigan for chilly evening flights`
    const list = parseClothingAdviceList(text)

    expect(list).toHaveLength(3)
    expect(list[0].text).toContain('Lightweight breathable cotton shirts')
    expect(list[1].text).toContain('Compact travel umbrella')
    expect(list[2].text).toContain('Light cardigan')
  })
})
