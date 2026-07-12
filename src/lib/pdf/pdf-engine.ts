import puppeteer from 'puppeteer'

/**
 * The only file in the app that imports Puppeteer. Kept deliberately thin
 * (html string in, PDF buffer out) so it can become the entire body of a
 * standalone Cloud Run service later — headless Chrome at 512Mi in the app
 * container OOMs in production (see AGENTS.md stack table). Not a concern
 * for local dev today; this boundary is what makes the move cheap later.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
