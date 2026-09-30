import { DynamoDBClient, ScanCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const db = new DynamoDBClient({ region: 'us-east-1' });
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-password',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,OPTIONS'
};

const unauthorized = () => ({
  statusCode: 401,
  headers: CORS,
  body: JSON.stringify({ error: 'Não autorizado.' })
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const senha = event.headers?.['x-admin-password'] || event.headers?.['X-Admin-Password'];
  if (!senha || senha !== ADMIN_PASSWORD) return unauthorized();

  const method = event.httpMethod;
  const id = event.pathParameters?.id;

  try {
    // GET /leads — lista todos
    if (method === 'GET') {
      const result = await db.send(new ScanCommand({ TableName: 'mourato-leads' }));
      const items = (result.Items || []).map(item => ({
        id:       item.id.S,
        empresa:  item.empresa.S,
        nome:     item.nome.S,
        email:    item.email.S,
        telefone: item.telefone.S,
        pratica:  item.pratica.S,
        contexto: item.contexto.S,
        status:   item.status.S,
        criadoEm: item.criadoEm.S
      })).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

      return { statusCode: 200, headers: CORS, body: JSON.stringify(items) };
    }

    // DELETE /leads/{id}
    if (method === 'DELETE' && id) {
      await db.send(new DeleteItemCommand({
        TableName: 'mourato-leads',
        Key: { id: { S: id } }
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // PATCH /leads/{id} — atualiza status (ex: 'novo' -> 'aprovado')
    if (method === 'PATCH' && id) {
      const body = JSON.parse(event.body || '{}');
      await db.send(new UpdateItemCommand({
        TableName: 'mourato-leads',
        Key: { id: { S: id } },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': { S: body.status || 'aprovado' } }
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Rota não encontrada.' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erro interno.' }) };
  }
};
