import natural from 'natural';
const { TfIdf } = natural;
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Obrigatório para upload de ficheiros
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const form = new IncomingForm();

  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao processar o formulário' });
        return resolve();
      }

      try {
        // Ajuste para Formidable v2/v3
        const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
        const question = Array.isArray(fields.question) ? fields.question[0] : fields.question;

        if (!pdfFile || !pdfFile.filepath) {
          res.status(400).json({ answer: "Erro: O ficheiro PDF não foi recebido corretamente." });
          return resolve();
        }

        // Ler o ficheiro do caminho temporário
        const dataBuffer = fs.readFileSync(pdfFile.filepath);
        
        // Extração de texto
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;

        if (!text || text.trim().length < 5) {
          res.status(200).json({ answer: "Não consegui ler texto deste PDF. Ele pode ser uma imagem ou estar protegido." });
          return resolve();
        }

        // Criar o motor de busca (TF-IDF)
        const sentences = text.split(/[.\n!]+/).filter(s => s.trim().length > 10);
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
          answer: bestMatch.trim() || "Não encontrei um trecho específico sobre isso.",
          relevance: highestScore.toFixed(2)
        });
        resolve();

      } catch (error) {
        console.error("Erro no processamento:", error);
        res.status(500).json({ error: "Erro interno ao ler o PDF." });
        resolve();
      }
    });
  });
}
