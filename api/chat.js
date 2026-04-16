import { TfIdf } from 'natural';
import pdf from 'pdf-parse';
import { IncomingForm } from 'formidable';
import fs from 'fs';

// Configuração obrigatória para Vercel não corromper o upload de ficheiros
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Apenas POST permitido' });

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Erro no upload' });

    try {
      // 1. Acesso à chave de ambiente (opcional se usar TF-IDF puro)
      const apiKey = process.env.API_KEY_CHAT;

      // 2. Extrair ficheiro e pergunta
      const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
      const question = Array.isArray(fields.question) ? fields.question[0] : fields.question;

      if (!pdfFile) return res.status(400).json({ answer: "Nenhum ficheiro enviado." });

      // 3. Ler o PDF
      const dataBuffer = fs.readFileSync(pdfFile.filepath);
      const pdfData = await pdf(dataBuffer);
      
      // 4. Fragmentar o texto em frases para análise
      const sentences = pdfData.text
        .split(/\n|(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 15);

      if (sentences.length === 0) {
        return res.status(200).json({ answer: "O PDF parece estar vazio ou é uma imagem (OCR necessário)." });
      }

      // 5. Motor TF-IDF
      const tfidf = new TfIdf();
      sentences.forEach(s => tfidf.addDocument(s));

      let highestScore = 0;
      let bestMatch = "";

      // Procurar a frase com maior pontuação matemática em relação à pergunta
      tfidf.tfidfs(question, (i, score) => {
        if (score > highestScore) {
          highestScore = score;
          bestMatch = sentences[i];
        }
      });

      // 6. Resposta Final
      res.status(200).json({
        answer: bestMatch || "Não encontrei um trecho relevante para essa pergunta.",
        relevance: highestScore.toFixed(2)
      });

    } catch (error) {
      res.status(500).json({ error: 'Erro ao processar PDF' });
    }
  });
}
