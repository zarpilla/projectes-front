// Text from the database shown with v-html must never run code (XSS): document
// comments and footers, the payment text, the contact form text.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml, richText, escapeHtml, guardBuefyMessages } from '@/helpers/safeHtml.js'
import { vi } from 'vitest'

describe('safeHtml', () => {
  it('keeps the formatting and the line breaks', () => {
    expect(richText('Pagament per transferència\nIBAN ES00 <b>0000</b>')).toBe('Pagament per transferència<br>IBAN ES00 <b>0000</b>')
    expect(sanitizeHtml('<p>Gràcies!<br><br>Contactarem amb tu</p>')).toBe('<p>Gràcies!<br><br>Contactarem amb tu</p>')
  })

  it('drops scripts, event handlers and dangerous tags', () => {
    expect(sanitizeHtml('<img src=x onerror="alert(1)">hola')).toBe('hola')
    expect(sanitizeHtml('<b onclick="steal()">hola</b>')).toBe('<b>hola</b>')
    expect(sanitizeHtml('abans<script>steal()</script>després')).toBe('abansdesprés')
    expect(sanitizeHtml('<iframe src="https://x"></iframe><style>*{}</style>ok')).toBe('ok')
    expect(sanitizeHtml('<svg onload="steal()"><circle/></svg>ok')).toBe('ok')
    expect(richText('<img src=x onerror=alert(1)>\nlínia')).toBe('<br>línia')
  })

  it('keeps only safe links, opened apart', () => {
    expect(sanitizeHtml('<a href="javascript:steal()">x</a>')).toBe('<a target="_blank" rel="noopener noreferrer">x</a>')
    expect(sanitizeHtml('<a href="https://ladiligencia.coop" style="x">web</a>')).toBe('<a href="https://ladiligencia.coop" target="_blank" rel="noopener noreferrer">web</a>')
    expect(sanitizeHtml('<a href="mailto:info@exemple.coop">correu</a>')).toContain('href="mailto:info@exemple.coop"')
  })

  it('keeps the text of unknown tags, and escapes plain text', () => {
    expect(sanitizeHtml('<font color="red">vermell</font>')).toBe('vermell')
    expect(sanitizeHtml(null)).toBe('')
    expect(escapeHtml('<b>"a" & \'b\'</b>')).toBe('&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;')
  })

  it('sanitizes the messages of the Buefy notices', () => {
    const open = vi.fn()
    const confirm = vi.fn()
    const buefy = { snackbar: { open }, dialog: { confirm }, toast: { open: vi.fn() } }
    guardBuefyMessages(buefy)
    guardBuefyMessages(buefy) // twice is harmless
    buefy.snackbar.open({ message: 'Arenys<img src=x onerror=steal()> afegida', type: 'is-success' })
    buefy.dialog.confirm({ message: 'Vols?<br><b>Sí</b>', onConfirm: () => {} })
    buefy.toast.open('<script>steal()</script>Fet')
    expect(open).toHaveBeenCalledWith({ message: 'Arenys afegida', type: 'is-success' })
    expect(confirm.mock.calls[0][0].message).toBe('Vols?<br><b>Sí</b>')
    expect(buefy.toast.open).not.toBe(open)
  })
})
