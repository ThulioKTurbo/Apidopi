const admin = require('firebase-admin');
const functions = require('@netlify/functions');
const path = require('path');

const bucket = admin.storage().bucket();
const db = admin.firestore();

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const imageId = event.queryStringParameters.imageId;
        const doc = await db.collection('user_images').doc(imageId).get();

        if (!doc.exists) {
            return { statusCode: 404, body: 'Imagem não encontrada.' };
        }

        const imageData = doc.data();
        const fileName = path.basename(imageData.imageUrl);

        // Deletar do Storage
        await bucket.file(fileName).delete();

        // Deletar do Firestore
        await db.collection('user_images').doc(imageId).delete();

        return { statusCode: 200, body: 'Imagem deletada com sucesso.' };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: 'Erro ao deletar imagem.' };
    }
};
