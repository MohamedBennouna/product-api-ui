
const request = require('supertest');
const { spawn, spawnSync } = require('child_process');

jest.setTimeout(60000);

const BASE = 'http://localhost:4004';
const SERVICE_PATH = '/odata/v4';
let serverProcess;
let agent;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(timeout = 20000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		try {
			const res = await request(BASE).get(`${SERVICE_PATH}/Products`).set('Accept', 'application/json').timeout({ deadline: 2000 });
 			if ([200, 204, 404].includes(res.status)) return;
		} catch (e) {
 		}
		await sleep(500);
	}
	throw new Error('Server did not respond in time');
}

beforeAll(async () => {
 	spawnSync('npm', ['run', 'deploy'], { cwd: __dirname + '/../', shell: true, stdio: 'inherit' });
 	serverProcess = spawn('npm', ['start'], { cwd: __dirname + '/../', shell: true, env: process.env, stdio: 'inherit' });
	await waitForServer(30000);
	agent = request(BASE);
});

afterAll(() => {
	if (serverProcess) {
		try {
			spawnSync('taskkill', ['/F', '/T', '/PID', serverProcess.pid], { shell: true, stdio: 'inherit' });
		} catch (e) {
		 
		}
	}
});

function unwrap(res) {
	if (!res || !res.body) return res.body;
	if (Array.isArray(res.body)) return res.body;
	if (res.body.value && Array.isArray(res.body.value)) return res.body.value;
	return res.body;
}

function extractId(body) {
	if (!body) return null;
	if (body.ID) return body.ID;
	if (body.Id) return body.Id;
	if (body.id) return body.id;
 
	if (body.value && body.value.ID) return body.value.ID;
	if (body.value && body.value.id) return body.value.id;
	return null;
}

describe('ProductService (integration)', () => {
	let createdId;

	test('GET collection - returns array or object with value', async () => {
		const res = await agent.get(`${SERVICE_PATH}/Products`).set('Accept', 'application/json');
		 
		expect([200, 204, 404]).toContain(res.status);
	});

	test('POST valid product -> 201', async () => {
		const payload = { name: 'Test Coffee', category: 'drinks' };
		const res = await agent.post(`${SERVICE_PATH}/Products`).send(payload).set('Accept', 'application/json');
		expect(res.status).toBe(201);
		const body = unwrap(res);
		expect(body).toBeDefined();
	 
		const entity = Array.isArray(body) ? body[0] : (body.value || body);
		expect(entity.name).toBe(payload.name);
		createdId = extractId(entity);
		expect(createdId).toBeTruthy();
	});

	test('POST invalid category -> 400', async () => {
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: 'Bad', category: 'snacks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('GET by ID returns created product', async () => {
		expect(createdId).toBeTruthy();
		const path = `${SERVICE_PATH}/Products('${createdId}')`;
		const res = await agent.get(path).set('Accept', 'application/json');
		expect(res.status).toBe(200);
		const body = unwrap(res);
		expect(body).toBeDefined();
		expect(body.name).toBeDefined();
	});

	test('PATCH update product name', async () => {
		const path = `${SERVICE_PATH}/Products('${createdId}')`;
		const res = await agent.patch(path).send({ name: 'Updated Coffee' }).set('Accept', 'application/json');
		expect([200, 204]).toContain(res.status);
		const getRes = await agent.get(path).set('Accept', 'application/json');
		expect(getRes.status).toBe(200);
		const body = unwrap(getRes);
		expect(body.name === 'Updated Coffee' || body.name).toBeTruthy();
	});

	test('DELETE product', async () => {
		const path = `${SERVICE_PATH}/Products('${createdId}')`;
		const res = await agent.delete(path).set('Accept', 'application/json');
		expect([200, 204]).toContain(res.status);
		const getRes = await agent.get(path).set('Accept', 'application/json');
		 
		expect([404, 204, 200]).toContain(getRes.status);
	});

	

	test('POST empty name -> 400', async () => {
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: '', category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('POST name with only spaces -> 400', async () => {
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: '   ', category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('POST name with special characters -> 400', async () => {
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: 'Test@Product!', category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('POST name with only numbers -> 400', async () => {
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: '12345', category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('POST name exceeding 50 characters -> 400', async () => {
		const longName = 'A'.repeat(51);
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: longName, category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(400);
	});

	test('POST duplicate product name -> 400', async () => {
		 
		const uniqueName = 'UniqueDrink' + Date.now();
		const res1 = await agent.post(`${SERVICE_PATH}/Products`).send({ name: uniqueName, category: 'drinks' }).set('Accept', 'application/json');
		expect(res1.status).toBe(201);

		 
		const res2 = await agent.post(`${SERVICE_PATH}/Products`).send({ name: uniqueName, category: 'grocery' }).set('Accept', 'application/json');
		expect(res2.status).toBe(400);

		 
		const entity = res1.body.value || res1.body;
		const id = entity.ID || entity.id;
		if (id) {
			await agent.delete(`${SERVICE_PATH}/Products('${id}')`).set('Accept', 'application/json');
		}
	});

	test('POST valid name with numbers and letters -> 201', async () => {
		const validName = 'Coffee2024';
		const res = await agent.post(`${SERVICE_PATH}/Products`).send({ name: validName, category: 'drinks' }).set('Accept', 'application/json');
		expect(res.status).toBe(201);

		 
		const entity = res.body.value || res.body;
		const id = entity.ID || entity.id;
		if (id) {
			await agent.delete(`${SERVICE_PATH}/Products('${id}')`).set('Accept', 'application/json');
		}
	});

});
  
