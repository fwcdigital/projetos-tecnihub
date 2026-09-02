const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const password = 'Admin@123';
const accounts = [
  ['João', 'joao.teste@tecnihub.local', ['[TESTE] Projeto A']],
  ['Pedro', 'pedro.teste@tecnihub.local', ['[TESTE] Projeto A']],
  ['Maria', 'maria.teste@tecnihub.local', ['[TESTE] Projeto B']],
  ['Lucas', 'lucas.teste@tecnihub.local', ['[TESTE] Projeto B']],
  ['ADMIN', 'admin.teste@tecnihub.local', ['[TESTE] Projeto A', '[TESTE] Projeto B']],
  ['SUPER_ADMIN', 'superadmin.teste@tecnihub.local', ['[TESTE] Projeto A', '[TESTE] Projeto B']]
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
for (const [name, email, expectedProjects] of accounts) {
  const login = await request('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!login.response.ok || !login.data.token) throw new Error(`Login falhou para ${name}: ${login.response.status}`);
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

const adminTasks = await request('/api/tasks', sessions.get('ADMIN'));
const taskB = adminTasks.data.tasks.find(task => task.title === '[TESTE] Tarefa do Projeto B');
const denied = await request(`/api/tasks/${taskB.id}`, sessions.get('Pedro'));
if (denied.response.status !== 403) throw new Error(`Acesso direto deveria retornar 403, retornou ${denied.response.status}.`);
console.log('[RBAC] Acesso direto de Pedro à tarefa do Projeto B: 403 confirmado.');

const adminToken = sessions.get('ADMIN');
const usersResponse = await request('/api/users', adminToken);
let crudUser = usersResponse.data.users.find(user => user.email === 'usuario.crud.teste@tecnihub.local');
if (!crudUser) {
  const created = await request('/api/users', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      name: '[TESTE] Usuário CRUD', email: 'usuario.crud.teste@tecnihub.local', password,
      role: 'COLLABORATOR', job_title: 'Validação de CRUD', avatar: ''
    })
  });
  if (created.response.status !== 201) throw new Error(`Criação de usuário falhou: ${created.response.status}`);
  crudUser = created.data.user;
}
const disabled = await request(`/api/users/${crudUser.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'INACTIVE', job_title: 'CRUD atualizado' }) });
if (!disabled.response.ok || disabled.data.user.status !== 'INACTIVE') throw new Error('Desativação de usuário não persistiu.');
const enabled = await request(`/api/users/${crudUser.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'ACTIVE' }) });
if (!enabled.response.ok || enabled.data.user.status !== 'ACTIVE') throw new Error('Ativação de usuário não persistiu.');
const forbiddenUserCreate = await request('/api/users', sessions.get('Pedro'), { method: 'POST', body: JSON.stringify({ name: 'Inválido', email: 'invalido@teste.local', password, role: 'COLLABORATOR' }) });
if (forbiddenUserCreate.response.status !== 403) throw new Error('COLLABORATOR conseguiu criar usuário.');
console.log('[CRUD] Criação, edição, desativação/ativação e bloqueio de usuário confirmados.');

const allProjects = await request('/api/projects', adminToken);
const projectA = allProjects.data.projects.find(project => project.name === '[TESTE] Projeto A');
const allUsers = (await request('/api/users', adminToken)).data.users;
const joao = allUsers.find(user => user.email === 'joao.teste@tecnihub.local');
const pedro = allUsers.find(user => user.email === 'pedro.teste@tecnihub.local');
const maria = allUsers.find(user => user.email === 'maria.teste@tecnihub.local');
let crudProject = allProjects.data.projects.find(project => project.name === '[TESTE] Projeto CRUD');
if (!crudProject) {
  const created = await request('/api/projects', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      name: '[TESTE] Projeto CRUD', description: 'Validação da criação real.', client_id: projectA.client_id,
      project_type: 'INTERNAL', manager_id: joao.id, status: 'PLANNING', priority: 'NORMAL',
      start_date: '2026-09-02', due_date: '2026-09-30', team_user_ids: [pedro.id]
    })
  });
  if (created.response.status !== 201) throw new Error(`Criação de projeto falhou: ${created.response.status} ${JSON.stringify(created.data)}`);
  crudProject = created.data.project;
}
const projectUpdate = await request(`/api/projects/${crudProject.id}`, adminToken, {
  method: 'PUT',
  body: JSON.stringify({ priority: 'HIGH', briefing: { objective: 'Briefing salvo pela API' }, team_user_ids: [pedro.id] })
});
if (!projectUpdate.response.ok || projectUpdate.data.project.briefing.objective !== 'Briefing salvo pela API') throw new Error('Edição/briefing do projeto não persistiu.');
if (new Set(projectUpdate.data.project.teamMembers.map(member => member.id)).size !== 2) throw new Error('Vínculos do projeto foram duplicados ou perdidos.');
const forbiddenProjectAdmin = await request(`/api/projects/${crudProject.id}`, sessions.get('João'), { method: 'PUT', body: JSON.stringify({ manager_id: maria.id }) });
if (forbiddenProjectAdmin.response.status !== 403) throw new Error('PROJECT_MANAGER conseguiu trocar o gestor do projeto.');

const projectTasks = await request(`/api/tasks?projectId=${crudProject.id}`, adminToken);
let crudTask = projectTasks.data.tasks.find(task => task.title === '[TESTE] Tarefa CRUD');
if (!crudTask) {
  const created = await request('/api/tasks', adminToken, {
    method: 'POST',
    body: JSON.stringify({ projectId: crudProject.id, title: '[TESTE] Tarefa CRUD', description: 'Persistência via API', assigneeId: pedro.id, status: 'A_FAZER', priority: 'ALTA', startDate: '2026-09-02', dueDate: '2026-09-15', dueTime: '09:30' })
  });
  if (created.response.status !== 201) throw new Error(`Criação de tarefa falhou: ${created.response.status}`);
  crudTask = created.data.task;
}
if (!crudTask.id) throw new Error('Tarefa CRUD não foi recuperada.');
const taskUpdate = await request(`/api/tasks/${crudTask.id}`, adminToken, { method: 'PUT', body: JSON.stringify({ status: 'EM_REVISAO', dueTime: '11:00' }) });
if (!taskUpdate.response.ok || taskUpdate.data.task.status !== 'EM_REVISAO') throw new Error('Atualização de tarefa não persistiu.');
const forbiddenAssignment = await request(`/api/tasks/${crudTask.id}`, sessions.get('Pedro'), { method: 'PUT', body: JSON.stringify({ assigneeId: maria.id }) });
if (forbiddenAssignment.response.status !== 400) throw new Error('COLLABORATOR atribuiu tarefa para usuário externo ao projeto.');
const temporary = await request('/api/tasks', adminToken, { method: 'POST', body: JSON.stringify({ projectId: crudProject.id, title: '[TESTE] Tarefa Temporária Exclusão', assigneeId: pedro.id, dueDate: '2026-09-20' }) });
if (temporary.response.status !== 201) throw new Error('Criação da tarefa temporária falhou.');
const deleted = await request(`/api/tasks/${temporary.data.task.id}`, adminToken, { method: 'DELETE' });
if (!deleted.response.ok) throw new Error('Exclusão de tarefa falhou.');
const afterDelete = await request(`/api/tasks/${temporary.data.task.id}`, adminToken);
if (afterDelete.response.status !== 404) throw new Error('Tarefa excluída ainda está disponível.');
console.log('[CRUD] Projeto, vínculos, briefing e tarefa persistentes confirmados.');
