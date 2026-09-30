import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const db = new DynamoDBClient({ region: 'us-east-1' });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { empresa, nome, email, telefone, pratica, contexto } = body;

    if (!empresa || !nome || !email || !telefone) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Campos obrigatórios ausentes.' })
      };
    }

    await db.send(new PutItemCommand({
      TableName: 'mourato-leads',
      Item: {
        id:       { S: randomUUID() },
        empresa:  { S: empresa },
        nome:     { S: nome },
        email:    { S: email },
        telefone: { S: telefone },
        pratica:  { S: pratica || 'hibrido' },
        contexto: { S: contexto || '' },
        status:   { S: 'novo' },
        criadoEm: { S: new Date().toISOString() }
      }
    }));

    return {
      statusCode: 201,
      headers: CORS,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Erro interno.' })
    };
  }
};
