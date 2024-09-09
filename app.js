const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Inicialize o Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert('caminho/para/sua/chave-de-servico.json'),
    storageBucket: 'seu-projeto.appspot.com'
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

// Rota para upload de imagem
app.post('/upload', upload.single('imagem'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Nenhum arquivo foi enviado.');
        }

        const blob = bucket.file(req.file.originalname);
        const blobStream = blob.createWriteStream();

        blobStream.on('error', (err) => {
            console.error(err);
            res.status(500).send('Erro ao fazer upload da imagem.');
        });

        blobStream.on('finish', async() => {
            await blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

            // Salvar metadados no Firestore
            await db.collection('user_images').add({
                userId: req.body.userId,
                fileName: req.file.originalname,
                imageUrl: publicUrl,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            res.status(200).send({ url: publicUrl });
        });

        blobStream.end(req.file.buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ocorreu um erro no servidor.');
    }
});

// Rota para listar imagens de um usuário
app.get('/images/:userId', async(req, res) => {
    try {
        const userId = req.params.userId;
        const snapshot = await db.collection('user_images')
            .where('userId', '==', userId)
            .get();

        const images = [];
        snapshot.forEach(doc => {
            images.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(images);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar imagens.');
    }
});

// Rota para deletar uma imagem
app.delete('/image/:imageId', async(req, res) => {
    try {
        const imageId = req.params.imageId;
        const doc = await db.collection('user_images').doc(imageId).get();

        if (!doc.exists) {
            return res.status(404).send('Imagem não encontrada.');
        }

        const imageData = doc.data();
        const fileName = path.basename(imageData.imageUrl);

        // Deletar do Storage
        await bucket.file(fileName).delete();

        // Deletar do Firestore
        await db.collection('user_images').doc(imageId).delete();

        res.status(200).send('Imagem deletada com sucesso.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao deletar imagem.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});