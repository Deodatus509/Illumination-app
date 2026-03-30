import express from 'express';
import cors from 'cors';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for dynamic PDF watermarking
  app.post('/api/watermark-pdf', async (req, res) => {
    try {
      const { pdfUrl, email } = req.body;

      if (!pdfUrl || !email) {
        return res.status(400).json({ error: 'Missing pdfUrl or email' });
      }

      // 1. Fetch the PDF from Cloudinary
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF from Cloudinary');
      }
      const pdfBytes = await response.arrayBuffer();

      // 2. Load the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // 3. Add watermark to each page
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(`Licensed to: ${email}`, {
          x: width / 4,
          y: height / 2,
          size: 30,
          color: rgb(0.8, 0.8, 0.8), // Light gray
          opacity: 0.5,
          rotate: degrees(45),
        });
      }

      // 4. Save and send the modified PDF
      const watermarkedPdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="document_secured.pdf"');
      res.send(Buffer.from(watermarkedPdfBytes));

    } catch (error) {
      console.error('Error watermarking PDF:', error);
      res.status(500).json({ error: 'Internal server error while processing PDF' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
