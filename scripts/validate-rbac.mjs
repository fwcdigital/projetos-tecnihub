const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const password = 'TecniHub2006';
const accounts = [
  ['Caio', 'caio@tecnihub.com.br', 'ADMIN', ['[TESTE] Projeto A', '[TESTE] Projeto B']],
  ['Fabricio', 'fabricio@tecnihub.com.br', 'ADMIN', ['[TESTE] Projeto A', '[TESTE] Projeto B']],
  ['Kelvin', 'kelvin@tecnihub.com.br', 'PROJECT_MANAGER', ['[TESTE] Projeto A', '[TESTE] Projeto B']],
  ['Gabriel', 'gabriel@tecnihub.com.br', 'COLLABORATOR', ['[TESTE] Projeto A', '[TESTE] Projeto B']]
];

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const sessions = new Map();
const scenarioProjectNames = new Set(['[TESTE] Projeto A', '[TESTE] Projeto B']);
const scenarioTaskNames = new Set(['[TESTE] Tarefa do Projeto A', '[TESTE] Tarefa do Projeto B']);
for (const [name, email, expectedRole, expectedProjects] of accounts) {
  const login = await request('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!login.response.ok || !login.data.token) throw new Error(`Login falhou para ${name}: ${login.response.status}`);
  if (login.data.user.role !== expectedRole) throw new Error(`Role incorreto para ${name}: ${login.data.user.role}`);
  const token = login.data.token;
  sessions.set(name, token);
  const projects = await request('/api/projects', token);
  const testProjects = projects.data.projects.filter(project => scenarioProjectNames.has(project.name)).map(project => project.name).sort();
  if (JSON.stringify(testProjects) !== JSON.stringify([...expectedProjects].sort())) {
    throw new Error(`${name} recebeu projetos incorretos: ${testProjects.join(', ')}`);
  }
  const tasks = await request('/api/tasks', token);
  const testTasks = tasks.data.tasks.filter(task => scenarioTaskNames.has(task.title));
  if (testTasks.length !== expectedProjects.length) throw new Error(`${name} recebeu ${testTasks.length} tarefas de teste.`);
  console.log(`[RBAC] ${name}: ${testProjects.length} projeto(s), ${testTasks.length} tarefa(s).`);
}

const adminToken = sessions.get('Caio');
const usersResponse = await request('/api/users', adminToken);
const gabrielUser = usersResponse.data.users.find(user => user.email === 'gabriel@tecnihub.com.br');
const disabled = await request(`/api/users/${gabrielUser.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'INACTIVE', job_title: 'Validação temporária', role: 'PROJECT_MANAGER' }) });
if (!disabled.response.ok || disabled.data.user.status !== 'INACTIVE') throw new Error('Desativação de usuário não persistiu.');
const enabled = await request(`/api/users/${gabrielUser.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'ACTIVE', job_title: 'Colaborador', role: 'COLLABORATOR', password }) });
if (!enabled.response.ok || enabled.data.user.status !== 'ACTIVE' || enabled.data.user.role !== 'COLLABORATOR') throw new Error('Restauração do usuário não persistiu.');
const forbiddenUserCreate = await request('/api/users', sessions.get('Gabriel'), { method: 'POST', body: JSON.stringify({ name: 'Inválido', email: 'invalido@teste.local', password, role: 'COLLABORATOR' }) });
if (forbiddenUserCreate.response.status !== 403) throw new Error('COLLABORATOR conseguiu criar usuário.');
console.log('[USUÁRIOS] Edição, role, senha, desativação/ativação e bloqueio confirmados sem criar conta extra.');

const allProjects = await request('/api/projects', adminToken);
const projectA = allProjects.data.projects.find(project => project.name === '[TESTE] Projeto A');
const allUsers = (await request('/api/users', adminToken)).data.users;
const kelvin = allUsers.find(user => user.email === 'kelvin@tecnihub.com.br');
const gabriel = allUsers.find(user => user.email === 'gabriel@tecnihub.com.br');
const fabricio = allUsers.find(user => user.email === 'fabricio@tecnihub.com.br');
let crudProject = allProjects.data.projects.find(project => project.name === '[TESTE] Projeto CRUD');
if (!crudProject) {
  const created = await request('/api/projects', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      name: '[TESTE] Projeto CRUD', description: 'Validação da criação real.', client_id: projectA.client_id,
      project_type: 'INTERNAL', manager_id: kelvin.id, status: 'PLANNING', priority: 'NORMAL',
      start_date: '2026-09-02', due_date: '2026-09-30', team_user_ids: [gabriel.id]
    })
  });
  if (created.response.status !== 201) throw new Error(`Criação de projeto falhou: ${created.response.status} ${JSON.stringify(created.data)}`);
  crudProject = created.data.project;
}
const projectUpdate = await request(`/api/projects/${crudProject.id}`, adminToken, {
  method: 'PUT',
  body: JSON.stringify({ priority: 'HIGH', briefing: { objective: 'Briefing salvo pela API' }, team_user_ids: [gabriel.id] })
});
if (!projectUpdate.response.ok || projectUpdate.data.project.briefing.objective !== 'Briefing salvo pela API') throw new Error('Edição/briefing do projeto não persistiu.');
if (new Set(projectUpdate.data.project.teamMembers.map(member => member.id)).size !== 2) throw new Error('Vínculos do projeto foram duplicados ou perdidos.');
const forbiddenProjectAdmin = await request(`/api/projects/${crudProject.id}`, sessions.get('Kelvin'), { method: 'PUT', body: JSON.stringify({ manager_id: fabricio.id }) });
if (forbiddenProjectAdmin.response.status !== 403) throw new Error('PROJECT_MANAGER conseguiu trocar o gestor do projeto.');

const projectTasks = await request(`/api/tasks?projectId=${crudProject.id}`, adminToken);
let crudTask = projectTasks.data.tasks.find(task => task.title === '[TESTE] Tarefa CRUD');
if (!crudTask) {
  const created = await request('/api/tasks', adminToken, {
    method: 'POST',
    body: JSON.stringify({ projectId: crudProject.id, title: '[TESTE] Tarefa CRUD', description: 'Persistência via API', assigneeId: gabriel.id, status: 'A_FAZER', priority: 'ALTA', startDate: '2026-09-02', dueDate: '2026-09-15', dueTime: '09:30' })
  });
  if (created.response.status !== 201) throw new Error(`Criação de tarefa falhou: ${created.response.status}`);
  crudTask = created.data.task;
}
if (!crudTask.id) throw new Error('Tarefa CRUD não foi recuperada.');
const taskUpdate = await request(`/api/tasks/${crudTask.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'EM_REVISAO', dueTime: '11:00' }) });
if (!taskUpdate.response.ok || taskUpdate.data.task.status !== 'EM_REVISAO') throw new Error('Atualização de tarefa não persistiu.');
const forbiddenAssignment = await request(`/api/tasks/${crudTask.id}`, sessions.get('Gabriel'), { method: 'PUT', body: JSON.stringify({ assigneeId: fabricio.id }) });
if (forbiddenAssignment.response.status !== 403) throw new Error('COLLABORATOR alterou responsáveis da tarefa.');
const temporary = await request('/api/tasks', adminToken, { method: 'POST', body: JSON.stringify({ projectId: crudProject.id, title: '[TESTE] Tarefa Temporária Exclusão', assigneeId: gabriel.id, dueDate: '2026-09-20' }) });
if (temporary.response.status !== 201) throw new Error('Criação da tarefa temporária falhou.');
const deleted = await request(`/api/tasks/${temporary.data.task.id}`, adminToken, { method: 'DELETE' });
if (!deleted.response.ok) throw new Error('Exclusão de tarefa falhou.');
const afterDelete = await request(`/api/tasks/${temporary.data.task.id}`, adminToken);
if (afterDelete.response.status !== 404) throw new Error('Tarefa excluída ainda está disponível.');
console.log('[CRUD] Projeto, vínculos, briefing e tarefa persistentes confirmados.');
