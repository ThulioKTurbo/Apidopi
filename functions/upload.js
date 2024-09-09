const admin = require('firebase-admin');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const functions = require('@netlify/functions');

// Inicializar Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert('firebase-admin/sua-chave-de-servico.json'),
    storageBucket: 'seu-projeto.appspot.com'
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const req = JSON.parse(event.body);
        const file = req.file;

        if (!file) {
            return { statusCode: 400, body: 'Nenhum arquivo foi enviado.' };
        }

        const blob = bucket.file(file.originalname);
        const blobStream = blob.createWriteStream();

        blobStream.on('error', (err) => {
            console.error(err);
            return { statusCode: 500, body: 'Erro ao fazer upload da imagem.' };
        });

        blobStream.on('finish', async() => {
            await blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

            // Salvar metadados no Firestore
            await db.collection('user_images').add({
                userId: req.body.userId,
                fileName: file.originalname,
                imageUrl: publicUrl,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { statusCode: 200, body: JSON.stringify({ url: publicUrl }) };
        });

        blobStream.end(file.buffer);
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: 'Ocorreu um erro no servidor.' };
    }
};
