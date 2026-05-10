import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: "Anda adalah 'Healtify', seorang asisten dan mentor kesehatan profesional. Tugas Anda adalah memberikan saran olahraga (workout), panduan nutrisi/makanan sehat, serta tips pola hidup sehat (seperti kualitas tidur dan manajemen stres). Berikan jawaban yang informatif, memotivasi, dan mudah dipraktikkan. Gunakan format Markdown untuk rencana makan atau jadwal olahraga agar mudah dibaca." 
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const chat = model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
    });

    const lastMessage = messages[messages.length - 1].text;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    
    res.json({ result: response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mendapatkan respons dari server." });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});