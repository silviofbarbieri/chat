import { TfIdf } from 'natural';
import pdf from 'pdf-parse';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const form = new IncomingForm({ keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Erro no upload' });
        return resolve();
      }

      try {
        // Na versão 3 do formidable, files.pdf é um array
        const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
        const question = Array.isArray(fields.question) ? fields.question[0] : fields.question;

        if (!pdfFile || !pdfFile.filepath) {
          res.status(400).json({ answer: "Ficheiro PDF não encontrado no envio." });
          return resolve();
        }

        // Leitura do buffer
        const dataBuffer = fs.readFileSync(pdfFile.filepath);
        const pdfData = await pdf(dataBuffer);
        
        // Se o PDF for imagem/scaneado, o texto virá vazio
        if (!pdfData.text || pdfData.text.trim().length === 0) {
          res.status(200).json({ answer: "O PDF parece estar vazio ou é uma imagem sem texto (OCR necessário)." });
          return resolve();
        }

        const sentences = pdfData.text
          .split(/\n|(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 10);

        const tfidf = new TfIdf();
        sentences.forEach(s => tfidf.addDocument(s));

        let highestScore = 0;
        let bestMatch = "";

        tfidf.tfidfs(question, (i, score) => {
          if (score > highestScore) {
            highestScore = score;
            bestMatch = sentences[i];
          }
        });

        res.status(200).json({
          answer: bestMatch || "Encontrei o texto, mas não há trechos relevantes para essa pergunta.",
          relevance: highestScore.toFixed(2)
        });
        resolve();

      } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ error: 'Falha ao processar o conteúdo do PDF' });
        resolve();
      }
    });
  });
}
