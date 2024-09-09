const admin = require('firebase-admin');
const functions = require('@netlify/functions');

const db = admin.firestore();

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const userId = event.queryStringParameters.userId;
        const snapshot = await db.collection('user_images')
            .where('userId', '==', userId)
            .get();

        const images = [];
        snapshot.forEach(doc => {
            images.push({ id: doc.id, ...doc.data() });
        });

        return { statusCode: 200, body: JSON.stringify(images) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: 'Erro ao buscar imagens.' };
    }
};
