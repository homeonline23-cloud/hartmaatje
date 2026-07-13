/** Export het veiligheidstest-formulier als PDF (browser). */
export async function downloadSafetyFormPdf(
  element: HTMLElement,
  filename = "HartMaatje-Safety-Testformulier-NL.pdf",
): Promise<void> {
  const { default: html2pdf } = await import("html2pdf.js");

  const options = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  await html2pdf()
    .set(options as never)
    .from(element)
    .save();
}
