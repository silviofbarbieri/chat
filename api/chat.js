import { TfIdf } from 'natural';
import pdf from 'pdf-parse';
import { IncomingForm } from 'formidable';
import fs from 'fs';

// Configuração necessária para a Vercel não tentar processar o body automaticamente
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao processar formulário' });
    }

    try {
      // 1. Acessar a chave (apenas para validar que o ambiente está ok)
      const apiKey = process.env.API_KEY_CHAT;

      // 2. Ler o arquivo PDF enviado
      const pdfFile = files.pdf[0] || files.pdf;
      const dataBuffer = fs.readFileSync(pdfFile.filepath);
      
      // 3. Extrair texto do PDF
      const pdfData = await pdf(dataBuffer);
      const fullText = pdfData.text;

      // 4. Limpar e dividir o texto em frases/sentenças
      // Dividimos por quebras de linha ou pontos seguidos de espaço
      const sentences = fullText
        .split(/\n|(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filtra ruídos curtos

      if (sentences.length === 0) {
        return res.status(400).json({ answer: "Não foi possível extrair texto legível do PDF." });
      }

      // 5. Aplicar TF-IDF
      const tfidf = new TfIdf();
      sentences.forEach((sentence) => {
        tfidf.addDocument(sentence);
      });

      const question = fields.question[0] || fields.question;
      let highestScore = 0;
      let bestMatch = "";

      // 6. Comparar a pergunta com cada frase (documento)
      tfidf.tfidfs(question, (i, score) => {
        if (score > highestScore) {
          highestScore = score;
          bestMatch = sentences[i];
        }
      });

      // 7. Retornar o trecho exato
      res.status(200).json({ 
        answer: bestMatch || "Desculpe, não encontrei um trecho relevante no documento.",
        relevance: highestScore.toFixed(2)
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
  });
}
