/**
 * pdfInforme.ts — Descarga un informe (hoja .report-paper) como PDF continuo de 297 mm de ancho.
 * Misma técnica que los informes de Concretos: se captura con html2canvas y se arma con jsPDF;
 * si el documento supera el alto máximo de jsPDF se divide en tramos.
 * Las librerías se cargan solo al descargar.
 */
export async function descargarInformePdf(el: HTMLElement, nombreArchivo: string, antesDeCapturar?: () => void | Promise<void>) {
  el.classList.add('pdf-capturing')
  try {
    await antesDeCapturar?.()
    await new Promise(r => setTimeout(r, 450))
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(el, { scale: 2.4, useCORS: true, backgroundColor: '#ffffff', logging: false, height: el.scrollHeight, windowHeight: el.scrollHeight })
    const anchoMm = 297
    const altoMm = (canvas.height * anchoMm) / canvas.width
    const MAX_MM = 5080
    if (altoMm <= MAX_MM) {
      const pdf = new jsPDF({ unit: 'mm', format: [anchoMm, altoMm], orientation: 'portrait' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, anchoMm, altoMm, undefined, 'FAST')
      pdf.save(nombreArchivo)
      return
    }
    const pxPorTramo = Math.floor((MAX_MM * canvas.width) / anchoMm)
    let pdf: InstanceType<typeof jsPDF> | null = null
    for (let y = 0; y < canvas.height; y += pxPorTramo) {
      const h = Math.min(pxPorTramo, canvas.height - y)
      const c = document.createElement('canvas')
      c.width = canvas.width; c.height = h
      c.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
      const mm = (h * anchoMm) / canvas.width
      if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [anchoMm, mm], orientation: 'portrait' })
      else pdf.addPage([anchoMm, mm])
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, anchoMm, mm, undefined, 'FAST')
    }
    pdf?.save(nombreArchivo)
  } finally {
    el.classList.remove('pdf-capturing')
  }
}
