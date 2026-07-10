// Render a self-contained HTML string to a downloadable multi-page A4 PDF.
//
// Mirrors the html2canvas + jsPDF pipeline used by the admission-form export
// (AddNewLead.handleDownloadPdf): mount the HTML offscreen, wait for images,
// snapshot at 2x, then slice the tall canvas into A4 pages. Extracted here so
// the receipt download and any future document export share one implementation.
//
// html2canvas + jspdf are dynamic-imported so they stay out of the main bundle.
export async function downloadHtmlAsPdf(html, filename = 'document.pdf', { width = 794 } = {}) {
  // Offscreen mount. width ~= A4 at 96dpi so the snapshot is crisp.
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;background:#fff;`;
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    const [{ default: html2canvas }, { default: JsPDFCtor }] = await Promise.all([
      import('html2canvas'),
      import('jspdf').then((m) => ({ default: m.jsPDF })),
    ]);
    // Wait for every <img> to finish (or fail) so nothing snapshots blank.
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }),
    );
    const canvas = await html2canvas(host, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false,
    });
    const pdf = new JsPDFCtor({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const dataUrl = canvas.toDataURL('image/png');
    let remaining = imgHeight;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      remaining -= pageHeight;
      if (remaining > 0) { position -= pageHeight; pdf.addPage(); }
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}

export default downloadHtmlAsPdf;
