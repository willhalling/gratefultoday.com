import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  customerAddress: string;
  lineItems: LineItem[];
}

export async function generateInvoicePDF(data: InvoiceData) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.9, 0.9, 0.9);

  let yPosition = height - 60;

  // Company Header
  page.drawText('INVOICE', {
    x: 50,
    y: yPosition,
    size: 28,
    font: fontBold,
    color: black,
  });

  yPosition -= 40;

  // Company Details (Right side)
  const companyDetails = [
    'Grateful Today LTD',
    'William Halling',
    '77 Silkham Road, Oxted, Surrey, RH80NS, United Kingdom',
    'Registered in England and Wales no: 15089485',
    'willhalling@gmail.com',
  ];

  companyDetails.forEach((line) => {
    const textWidth = font.widthOfTextAtSize(line, 9);
    page.drawText(line, {
      x: width - 50 - textWidth,
      y: yPosition,
      size: 9,
      font: font,
      color: gray,
    });
    yPosition -= 14;
  });

  yPosition -= 20;

  // Invoice Details
  page.drawText(`Invoice Number: ${data.invoiceNumber}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: black,
  });

  yPosition -= 18;

  page.drawText(`Invoice Date: ${formatDate(data.invoiceDate)}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: gray,
  });

  yPosition -= 18;

  page.drawText(`Due Date: ${formatDate(data.dueDate)}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: gray,
  });

  yPosition -= 40;

  // Bill To Section
  page.drawText('BILL TO:', {
    x: 50,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: black,
  });

  yPosition -= 20;

  page.drawText(data.customerName, {
    x: 50,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: black,
  });

  yPosition -= 18;

  if (data.customerCompany) {
    page.drawText(data.customerCompany, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: gray,
    });
    yPosition -= 18;
  }

  page.drawText(data.customerEmail, {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: gray,
  });

  yPosition -= 18;

  if (data.customerAddress) {
    const addressLines = data.customerAddress.split('\n');
    addressLines.forEach((line) => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 9,
        font: font,
        color: gray,
      });
      yPosition -= 14;
    });
  }

  yPosition -= 30;

  // Table Header
  const tableTop = yPosition;
  const tableLeft = 50;
  const tableWidth = width - 100;

  // Draw header background
  page.drawRectangle({
    x: tableLeft,
    y: yPosition - 25,
    width: tableWidth,
    height: 25,
    color: lightGray,
  });

  // Table Headers
  page.drawText('Description', {
    x: tableLeft + 10,
    y: yPosition - 17,
    size: 10,
    font: fontBold,
    color: black,
  });

  page.drawText('Qty', {
    x: tableLeft + tableWidth - 200,
    y: yPosition - 17,
    size: 10,
    font: fontBold,
    color: black,
  });

  page.drawText('Price', {
    x: tableLeft + tableWidth - 140,
    y: yPosition - 17,
    size: 10,
    font: fontBold,
    color: black,
  });

  page.drawText('Total', {
    x: tableLeft + tableWidth - 70,
    y: yPosition - 17,
    size: 10,
    font: fontBold,
    color: black,
  });

  yPosition -= 40;

  // Line Items
  let subtotal = 0;

  data.lineItems.forEach((item, index) => {
    const itemTotal = item.quantity * item.price;
    subtotal += itemTotal;

    // Description
    page.drawText(item.description, {
      x: tableLeft + 10,
      y: yPosition,
      size: 9,
      font: font,
      color: black,
    });

    // Quantity
    page.drawText(item.quantity.toString(), {
      x: tableLeft + tableWidth - 200,
      y: yPosition,
      size: 9,
      font: font,
      color: black,
    });

    // Price
    page.drawText(`£${item.price.toFixed(2)}`, {
      x: tableLeft + tableWidth - 140,
      y: yPosition,
      size: 9,
      font: font,
      color: black,
    });

    // Total
    page.drawText(`£${itemTotal.toFixed(2)}`, {
      x: tableLeft + tableWidth - 70,
      y: yPosition,
      size: 9,
      font: font,
      color: black,
    });

    yPosition -= 25;
  });

  yPosition -= 20;

  // Total Section
  page.drawLine({
    start: { x: tableLeft + tableWidth - 150, y: yPosition },
    end: { x: tableLeft + tableWidth, y: yPosition },
    thickness: 1,
    color: black,
  });

  yPosition -= 25;

  page.drawText('TOTAL:', {
    x: tableLeft + tableWidth - 150,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: black,
  });

  page.drawText(`£${subtotal.toFixed(2)}`, {
    x: tableLeft + tableWidth - 70,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: black,
  });

  yPosition -= 60;

  // Payment Details
  page.drawText('PAYMENT DETAILS', {
    x: 50,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: black,
  });

  yPosition -= 20;

  page.drawText('Invoice payable within 7 days to:', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: gray,
  });

  yPosition -= 18;

  page.drawText('Sort Code: 40-18-00', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: black,
  });

  yPosition -= 16;

  page.drawText('Account Number: 11145630', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: black,
  });

  yPosition -= 30;

  page.drawText('International Payments:', {
    x: 50,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: black,
  });

  yPosition -= 18;

  page.drawText('International Bank Account Number', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: gray,
  });

  yPosition -= 16;

  page.drawText('GB39HBUK40180011145630', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: black,
  });

  yPosition -= 20;

  page.drawText('Branch Identifier Code', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: gray,
  });

  yPosition -= 16;

  page.drawText('HBUKGB41940', {
    x: 50,
    y: yPosition,
    size: 9,
    font: font,
    color: black,
  });

  // Footer
  const footerY = 40;
  page.drawText('Thank you for your business!', {
    x: width / 2 - font.widthOfTextAtSize('Thank you for your business!', 9) / 2,
    y: footerY,
    size: 9,
    font: font,
    color: gray,
  });

  // Save and download the PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Format filename as inv-001-january-2025.pdf
  const date = new Date(data.invoiceDate);
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();
  const invoiceNum = data.invoiceNumber.toLowerCase();
  link.download = `${invoiceNum}-${month}-${year}.pdf`;
  
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}
