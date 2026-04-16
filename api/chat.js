import { TfIdf } from 'natural';
import pdf from 'pdf-parse';

export default async function handler(req, res) {
    // 1. Pega o PDF e a Pergunta do corpo da requisição
    // 2. Extrai o texto: 
    const data = await pdf(bufferDoArquivo);
    const textoCompleto = data.text;

    // 3. Divide o texto em sentenças (ou parágrafos)
    const sentencas = textoCompleto.split(/[.!?\n]/);

    // 4. Aplica o TF-IDF
    const tfidf = new TfIdf();
    sentencas.forEach((s, index) => tfidf.addDocument(s, index));

    let melhorTrecho = "";
    let maiorScore = 0;

    // 5. Compara a pergunta com as sentenças
    tfidf.tfidfs(req.body.question, (i, score) => {
        if (score > maiorScore) {
            maiorScore = score;
            melhorTrecho = sentencas[i];
        }
    });

    res.status(200).json({ answer: melhorTrecho || "Trecho não encontrado." });
}
