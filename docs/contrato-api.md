# Contrato da API — LSG FIT

Referência única para o servidor (`server/`), o app mobile (`mobile/`) e o app web da academia (repositório separado).
Qualquer mudança de contrato deve ser feita **aqui primeiro**.

## 1. Visão geral

| Conta | Onde usa | Tabela | Papel (`role`) | Transporte da sessão |
|---|---|---|---|---|
| Aluno | mobile | `users` | `STUDENT` | `Authorization: Bearer <token>` |
| Profissional | mobile | `users` | `PROFESSIONAL` | `Authorization: Bearer <token>` |
| Membro da academia | web | `gym_members` (academia em `gyms`) | `GYM` | cookie `sid` (HttpOnly) + `X-CSRF-Token` |

- Aluno e profissional usam o **mesmo login**. O backend decide o papel.
- Só a academia cadastra profissionais. O aluno se cadastra sozinho. A academia se cadastra livremente.
- A academia (`gyms`) não tem login. Quem entra no web são os **membros** (`gym_members`), cada um com e-mail e senha próprios. Quem cadastra a academia vira o dono (`OWNER`); o dono convida administradores (`ADMIN`).
- Um papel por conta. Um e-mail pertence a uma única conta, seja `users` ou `gym_members`.
- A academia **nunca** acessa avaliações físicas (RNF05).

### Formato de erro
Todo erro responde `{ "message": string, "code"?: string }`.

| Status | `code` | Quando |
|---|---|---|
| 400 | — | dados inválidos (mensagem descreve) |
| 401 | `SESSION_EXPIRED` | sem sessão, sessão expirada, revogada ou token reutilizado após rotação |
| 401 | — | credenciais inválidas no login ("E-mail ou senha inválidos.") |
| 403 | `EMAIL_NOT_VERIFIED` | aluno tenta entrar sem confirmar o e-mail |
| 400 | `INVALID_INVITE` | link de convite do profissional inválido, expirado ou já usado |
| 403 | `ACCOUNT_NOT_ACTIVATED` | profissional tenta entrar antes de criar a senha |
| 403 | `CSRF_INVALID` | sessão por cookie sem `X-CSRF-Token` válido, ou `Origin` não permitido |
| 403 | `FORBIDDEN_ROLE` | papel sem acesso à rota ("Acesso negado para este tipo de conta.") |
| 404 | — | registro não encontrado (inclui sessão de outra conta) |
| 409 | `EMAIL_IN_USE` | e-mail já pertence a alguma conta |
| 429 | `RATE_LIMITED` | limite de requisições (ver §6) |
| 503 | — | Redis fora do ar: rotas que dependem de sessão respondem "Serviço de sessão indisponível. Tente novamente em instantes." |

## 2. Sessão

### 2.1 Armazenamento (Redis)
| Chave | Conteúdo |
|---|---|
| `session:<sessionId>` | `{ accountType: "user"\|"gym", accountId, role, gymId, transport: "cookie"\|"bearer", csrfToken?, remember, createdAt, rotatedAt, lastActiveAt, userAgent, deviceName, ip }` |
| `session-token:<sha256(token)>` | `sessionId` |
| `account-sessions:<user\|gym>:<accountId>` | conjunto de `sessionId` ativos |

- Na academia, `accountId` é o membro (`gym_members.id`) e `gymId` é a academia dele. Para aluno e profissional, `gymId` fica vazio. Cada membro tem as próprias sessões.
- `sessionId` é público (aparece na listagem) e **não muda** durante a sessão. O token é secreto e nunca é listado.
- O token é aleatório (32 bytes, base64url). No Redis fica só o hash.
- O TTL das chaves é o tempo de inatividade, limitado pelo tempo absoluto restante. É renovado a cada requisição.

### 2.2 Tempos
| Regra | Web (academia) sem "lembrar" | Web com "lembrar" | Mobile |
|---|---|---|---|
| Absoluto (desde o login) | 1 dia | 30 dias | 90 dias |
| Inatividade | 1 h | 1 dia | 30 dias |
| Rotação do token | 15 min | 15 min | não tem |

### 2.3 Cookie (web)
```
Set-Cookie: sid=<token>; HttpOnly; Secure; SameSite=Lax; Path=/[; Max-Age=<segundos até o absoluto>]
Set-Cookie: csrf_token=<csrfToken>; Secure; SameSite=Lax; Path=/[; Max-Age=<mesmo do sid>]
```
- `csrf_token` não é HttpOnly: o app web lê com `document.cookie` e envia no header `X-CSRF-Token` (seção 2.7). Sai junto com o `sid` no login, cadastro, redefinição de senha e em cada rotação.
- Sem "lembrar": sem `Max-Age`, os cookies somem ao fechar o navegador.
- `Secure` desligado quando `COOKIE_SECURE=false` (desenvolvimento).
- Logout ou revogação da sessão atual: `Set-Cookie: sid=; Max-Age=0; ...` e `Set-Cookie: csrf_token=; Max-Age=0; ...`.

### 2.4 Rotação (só cookie)
- Na primeira requisição autenticada após 15 min de `rotatedAt`, o servidor gera um token novo para o **mesmo** `sessionId` e responde com `Set-Cookie`.
- O token antigo continua válido por **60 s** (tolerância para requisições paralelas).
- Uso do token antigo depois da tolerância revoga a sessão inteira (401 `SESSION_EXPIRED`).
- A rotação não muda `createdAt` (absoluto) nem `csrfToken`.

### 2.5 Eventos que criam ou derrubam sessões
- Login, cadastro com sessão, ativação e redefinição de senha **criam uma sessão nova**.
- Redefinição de senha e ativação **revogam todas as outras sessões** da conta.

### 2.6 Resolução no middleware
1. Se houver `Authorization: Bearer <token>`, usa o token e define o transporte como bearer.
2. Senão, se houver o cookie `sid`, usa o cookie e define o transporte como cookie.
3. Senão, responde 401 `SESSION_EXPIRED`.

Preenche `req.userId` (id da conta), `req.userRole`, `req.sessionId` e `req.sessionTransport`.

### 2.7 CSRF (só transporte cookie)
- `csrfToken` é gerado com a sessão e vale enquanto ela durar. O app web lê do cookie `csrf_token`. Ele também vem no corpo do login, do cadastro e da redefinição, e em `GET /sessions/csrf`.
- O servidor compara o header com o token guardado na sessão no Redis, não com o cookie.
- `POST`, `PATCH`, `PUT` e `DELETE` autenticados por cookie exigem `X-CSRF-Token` igual ao da sessão **e** `Origin` igual a `WEB_ORIGIN`. Se não, 403 `CSRF_INVALID`.
- As rotas públicas da academia que criam sessão (`POST /gyms`, `POST /gyms/sessions`, `POST /gyms/reset-password`, `POST /gyms/members/activate`), `POST /gyms/members/invite` e `POST /gyms/forgot-password` recusam com 403 `CSRF_INVALID` quando o header `Origin` estiver presente e for diferente de `WEB_ORIGIN`.
- CORS: `origin: [WEB_ORIGIN, MOBILE_ORIGIN]`, `credentials: true`. `MOBILE_ORIGIN` é o app mobile no navegador (Expo web) e vale só para o CORS: não passa nas rotas da academia nem no CSRF. No celular o app não envia `Origin` e não é afetado.

### 2.8 Variáveis de ambiente
| Variável | Exemplo |
|---|---|
| `REDIS_URL` | `redis://:senha@192.168.1.8:6379` |
| `WEB_ORIGIN` | `http://localhost:5173` |
| `MOBILE_ORIGIN` | `http://localhost:8081` (opcional, Expo web) |
| `APP_TIMEZONE` | `America/Sao_Paulo` (opcional; fuso da regra de um treino por dia) |
| `COOKIE_SECURE` | `false` em desenvolvimento, `true` em produção |
| `TRUST_PROXY` | `1` em produção, atrás de um proxy |

O `JWT_SECRET` deixa de existir.

## 3. Rotas de sessão (todas as contas)

### `POST /sessions` — login de aluno ou profissional (mobile)
Headers: `X-Device-Name: iPhone 15 - iOS 18` (opcional, só caracteres ASCII: o Android recusa headers com outros caracteres).
```json
{ "email": "aluno@email.com", "password": "..." }
```
| Resultado | Status | Corpo |
|---|---|---|
| Sucesso | 200 | `{ "user": User, "token": "...", "sessionId": "..." }` |
| Credenciais inválidas | 401 | "E-mail ou senha inválidos." |
| Aluno sem confirmar e-mail | 403 `EMAIL_NOT_VERIFIED` | "Confirme seu e-mail antes de entrar." |
| Profissional sem senha | 403 `ACCOUNT_NOT_ACTIVATED` | "Conta ainda não ativada. Abra o link do convite enviado para o seu e-mail para criar a senha." |

### `GET /sessions/csrf` — recuperar o token CSRF (web)
`200 { "csrfToken": "..." }`. Para sessão bearer: `200 { "csrfToken": null }`.

### `GET /sessions` — listar as minhas sessões
```json
[
  {
    "id": "b3f1…",
    "current": true,
    "device": { "browser": "Chrome", "os": "Windows", "type": "desktop" },
    "deviceName": null,
    "ip": "177.xx.xx.10",
    "remember": true,
    "createdAt": "2026-11-04T12:00:00.000Z",
    "lastActiveAt": "2026-11-04T14:32:00.000Z"
  }
]
```
- Ordenada por `lastActiveAt`, da mais recente para a mais antiga.
- `device` vem do User-Agent (`ua-parser-js` 1.x). Os campos são `null` quando não identificados, e `type` é `"desktop" | "mobile" | "tablet" | null`.
- `deviceName` vem do `X-Device-Name` (mobile). É gravado na criação da sessão e atualizado em toda requisição autenticada que enviar o header.
- `ip` é o do último acesso, sempre mascarado: IPv4 `a.xx.xx.d`, IPv6 só os 2 primeiros blocos seguidos de `:xxxx…`.

### `DELETE /sessions/:id` — encerrar uma sessão
- `:id` pode ser `current`, que equivale ao logout.
- `204`. Se for a sessão atual por cookie, também limpa o cookie.
- `404` se a sessão não existir ou for de outra conta.

### `DELETE /sessions` — encerrar todas as sessões da conta (inclusive a atual)
`204`. No cookie, também limpa o cookie.

## 4. Aluno e profissional (mobile)

### Tipo `User`
```ts
type User = {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'PROFESSIONAL';
  phone: string | null;
  // Aluno: profissional que o orienta (relação "Orienta"); null para profissional
  professionalId: string | null;
  // Aluno: academia da matrícula. Profissional: academia que o contratou.
  gymId: string | null;
  gym: GymSummary | null;   // ver §5 (nome, telefone e endereço)
  // Só aluno (null para profissional)
  gymEnrolledAt: string | null;
  // Só profissional (null para aluno)
  specialty: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Cadastro e acesso
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /users` (só aluno) | `{ name, email, password, confirmPassword }` (sem academia: quem matricula é a academia, §5) | `201 { user, message }`. Com `EMAIL_VERIFICATION=off`: `201 { user, message, token, sessionId }` | 400 senhas diferentes, 409 `EMAIL_IN_USE` |
| `POST /users/verify` | `{ email, code }` | `200 { user, token, sessionId }` | 400 "Código inválido ou expirado." |
| `POST /users/resend-verification` | `{ email }` | `200 { message }` (genérica) | — |
| `POST /users/forgot-password` | `{ email }` | `200 { message }` (sempre a mesma) | — |
| `POST /users/reset-password` | `{ email, code, password, confirmPassword }` | `200 { user, token, sessionId }` | 400 senhas diferentes ou código inválido |
| `POST /users/activate/invite` (página web "ativar conta") | `{ token }` | `200 { name, email, gymName, expiresAt }` | 400 `INVALID_INVITE` |
| `POST /users/activate` (página web "ativar conta") | `{ token, password, confirmPassword }` | `200 { email, message }` (não cria sessão) | 400 senhas diferentes, 400 `INVALID_INVITE` |

- `forgot-password` envia o código de redefinição (`PASSWORD_RESET`, 15 min). Se a conta for de um **profissional ainda não ativado**, envia um novo link de convite (`PROFESSIONAL_INVITE`, 72 h).
- **Convite do profissional por link.** O e-mail traz `<WEB_ORIGIN>/ativar-conta?token=<token>`. A página do app web lê o `token` da URL, chama `POST /users/activate/invite` para mostrar "Olá, {name}. A academia {gymName} convidou você." e envia o formulário de senha para `POST /users/activate`. Depois do sucesso, a página orienta a entrar no app mobile com o e-mail e a senha.
- O token vai no **corpo** (não na URL da API), para não aparecer em logs. As duas rotas passam pela checagem de `Origin` (§2.7).
- `activate` só funciona para profissional sem senha. Cria a senha, marca `emailVerified = true` e apaga o token (uso único). Não cria sessão: o profissional entra pelo app mobile.
- Mensagem de `INVALID_INVITE`: "Link inválido ou expirado. Peça um novo convite à academia."
- `reset-password` recusa profissional sem senha (responde como código inválido).
- Mensagem genérica de `forgot-password`: "Se o e-mail existir, um código de redefinição foi enviado."
- Os headers `X-Device-Name` valem em todas as rotas que criam sessão.

### Perfil
| Rota | Papel | Corpo | Sucesso |
|---|---|---|---|
| `GET /users/me` | STUDENT, PROFESSIONAL | — | `200 User` |
| `PATCH /users/me` | STUDENT, PROFESSIONAL | `{ name?, phone? }` e, se profissional, `{ specialty?, bio? }` | `200 User` |
| `PATCH /users/me/professional` | STUDENT | `{ professionalId: string \| null }` | `200 User` |

O profissional **não** troca de academia. Os campos `gymId` e `role` são ignorados no `PATCH /users/me`.

### Profissionais
| Rota | Papel | Sucesso |
|---|---|---|
| `GET /professionals` | autenticado | `200 [{ id, name, email, phone, specialty, bio, gymId, gym, studentsCount }]`, só profissionais ativados, ordenados por nome |
| `GET /professionals/students` | PROFESSIONAL | sem mudança de formato |
| `GET /professionals/students/:studentId/workout-sessions` | PROFESSIONAL | sem mudança |
| `/professionals/students/:studentId/workout-plan` (GET, POST, PATCH `/:id`, DELETE `/:id`) | PROFESSIONAL | mesma ficha que o aluno edita; ver §4.1 |
| `/professionals/students/:studentId/physical-assessments` (GET, POST) | PROFESSIONAL | sem mudança |

**Saem:** `POST /professionals`, `POST /professionals/sessions`, `GET /professionals/me` e `PATCH /professionals/me`. O perfil do profissional passa a ser `/users/me`.

`/physical-assessments` não muda de formato. `/workout-sessions` mantém o formato, com uma regra nova:
- **Um treino por dia:** `POST /workout-sessions` (`{ dayOfWeek }`, "Finalizar treino") responde `409 ALREADY_TRAINED_TODAY` ("Você já concluiu o treino de hoje. O próximo fica disponível amanhã.") se o aluno já concluiu um treino hoje, no fuso `APP_TIMEZONE` (padrão `America/Sao_Paulo`).
- **Treino do dia = dia da semana:** só dá para finalizar o treino do `dayOfWeek` de hoje (fuso `APP_TIMEZONE`); outro dia responde `409 NOT_TODAYS_WORKOUT` ("Esse não é o treino de hoje."). Dia sem treino na ficha é descanso: o app mostra o próximo dia com treino ("Disponível no domingo"). Depois de concluir, o próximo aparece bloqueado até o dia dele. "Finalizar" só aparece com pelo menos uma série feita num exercício com carga registrada; "Desistir" sai sem registrar nada.

### 4.1 Ficha de treino e exercícios
**O aluno monta a própria ficha, assim como o profissional.** Os dois editam a **mesma** ficha: qualquer um adiciona, edita ou remove qualquer exercício. Cada exercício guarda quem o adicionou (`addedBy`).

| Rota | Papel | Corpo | Sucesso |
|---|---|---|---|
| `GET /workout-plan` | STUDENT | — | `200 WorkoutDay[]` (os 7 dias, mesmo vazios) |
| `POST /workout-plan` | STUDENT | `{ exerciseId, dayOfWeek, sets, reps, weight?, restSeconds? }` | `201 WorkoutEntry` |
| `PATCH /workout-plan/:id` | STUDENT | `{ sets?, reps?, weight?, restSeconds? }` | `200 WorkoutEntry` |
| `DELETE /workout-plan/:id` | STUDENT | — | `204` |
| `/professionals/students/:studentId/workout-plan` | PROFESSIONAL | iguais às de cima, para um aluno dele | iguais; 404 se o aluno não for dele |
| `GET /exercises` | qualquer conta | `?muscleGroup=`, `?studentId=` (profissional) | `200 Exercise[]` |
| `GET /equipment` | público | — | `200 [{ key, label, defaultForGyms, alwaysAvailable }]` |

```ts
type EquipmentKey = "BODYWEIGHT" | "DUMBBELL" | "BARBELL" | "BENCH" | "MAT" | "PULL_UP_BAR" | "KETTLEBELL"
  | "RESISTANCE_BAND" | "CABLE" | "SMITH" | "LEG_PRESS" | "LEG_EXTENSION" | "LEG_CURL" | "PEC_DECK"
  | "PREACHER_BENCH" | "CALF_RAISE_MACHINE";

type Exercise = {
  id: string; name: string; muscleGroup: string;
  equipment: EquipmentKey[];       // todos os necessários (ex.: supino reto = BARBELL + BENCH); [] = peso corporal
  equipmentLabel: string;          // "Barra + Banco"
  usesLoad: boolean;               // false = peso corporal (sem halteres, barra, kettlebell ou máquina): o app não pede carga e o servidor grava weight = null
  instructions: string | null; gifUrl: string | null; videoUrl: string | null;
  availableAtGym: boolean | null;  // existe na academia de referência? null = sem academia para comparar
};

type WorkoutEntry = {
  id: string; sets: number; reps: number; weight: number | null; restSeconds: number | null; order: number;
  exercise: Exercise;
  addedBy: { id: string; name: string; role: "STUDENT" | "PROFESSIONAL" } | null;
};
type WorkoutDay = { dayOfWeek: "MONDAY" | ... | "SUNDAY"; entries: WorkoutEntry[] };
```
- **Disponibilidade:** um exercício está disponível na academia quando ela tem **todos** os equipamentos dele. `BODYWEIGHT` está sempre disponível.
- **Academia de referência** para `availableAtGym`: para o aluno, a academia dele; para o profissional com `?studentId=`, a academia desse aluno (404 se o aluno não for dele); para o membro da academia, a própria academia. Nos outros casos, `null`.
- Exercícios indisponíveis **podem** ser colocados na ficha (o aluno pode treinar em outro lugar). O app só avisa.
- **Biblioteca curada (RF08):** só a LSG FIT cadastra exercícios (pelo seed), para manter GIFs, vídeos e instruções no mesmo padrão em todas as academias. Não existe rota para criar ou remover exercício; aluno e profissional só consultam.
- Erros da ficha: 400 com a mensagem do campo ou "Esse exercício já está no treino desse dia."; 404 "Exercício do treino não encontrado." (inclui id que não é UUID).

## 5. Academia (web)

### Tipos
```ts
type GymAddress = {
  zipCode: string;          // 8 dígitos, sem hífen
  street: string;
  number: string;           // texto: aceita "S/N"
  complement: string | null;
  district: string;         // bairro
  city: string;
  state: string;            // UF, ex.: "SP"
  formatted: string;        // "Avenida Paulista, 1000 - Loja 2, Bela Vista, São Paulo - SP, 01310-100"
};

type GymSummary = { id: string; name: string; phone: string | null; address: GymAddress | null };
type Gym = GymSummary & {
  equipment: EquipmentKey[];   // equipamentos que a academia tem (§4.1); sem BODYWEIGHT, que vale sempre
  createdAt: string; updatedAt: string;
};

type GymMember = {
  id: string; name: string; email: string;
  role: "OWNER" | "ADMIN";
  activated: boolean;       // false = convite pendente
  createdAt: string;
};
```

**Endereço no corpo** (`POST /gyms` em `gym.address`, `PATCH /gyms/me` em `address`): `{ zipCode, street, number, complement?, district, city, state }`.
- CEP com 8 dígitos (com ou sem hífen), UF válida (maiúscula ou minúscula). Rua, número, bairro e cidade são obrigatórios; complemento é opcional.
- No `PATCH`: omitir `address` mantém o atual; `null` apaga.
- Erros 400 com a mensagem do campo, ex.: "Informe um CEP válido (8 dígitos)."

### Autenticação dos membros
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /gyms` | `{ name, email, password, confirmPassword, gym: { name, phone?, address? } }` (`name`/`email` são da pessoa, que vira o dono) | `201 { member, gym, csrfToken }` + cookie (sem "lembrar") | 400 (inclui "Informe o nome da academia."), 409 `EMAIL_IN_USE` |
| `POST /gyms/sessions` | `{ email, password, rememberDevice?: boolean }` | `200 { member, gym, csrfToken }` + cookie | 401 "E-mail ou senha inválidos.", 403 `ACCOUNT_NOT_ACTIVATED` (convidado sem senha) |
| `POST /gyms/forgot-password` | `{ email }` | `200 { message }` (sempre a mesma). Convidado sem senha recebe um novo link de convite | — |
| `POST /gyms/reset-password` | `{ email, code, password, confirmPassword }` | `200 { member, gym, csrfToken }` + cookie (sem "lembrar"); revoga as outras sessões do membro | 400 |
| `GET /gyms` (público) | — | `200 [GymSummary]`, ordenadas por nome (o mobile usa no cadastro do aluno) | — |

### Academia e conta do membro logado
- `equipment` no `PATCH` é a **lista completa** (substitui a atual). Na academia nova já vêm marcados os equipamentos com `defaultForGyms: true` em `GET /equipment` (halteres, barra, banco, colchonete e barra fixa). Equipamento inválido: 400 "Equipamento inválido: X."

| Rota | Quem | Corpo | Sucesso |
|---|---|---|---|
| `GET /gyms/me` | membro | — | `200 Gym` |
| `PATCH /gyms/me` | membro | `{ name?, phone?, address?, equipment? }` | `200 Gym` |
| `GET /gyms/me/account` | membro | — | `200 GymMember` (a pessoa logada) |
| `PATCH /gyms/me/account` | membro | `{ name }` | `200 GymMember` |

### Membros da academia
| Rota | Quem | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `GET /gyms/me/members` | membro | — | `200 [GymMember]`, dono primeiro, depois por nome | — |
| `POST /gyms/me/members` | **dono** | `{ name, email }` | `201 GymMember` (`activated: false`); envia o link de convite (72 h) | 403 `FORBIDDEN_ROLE` ("Só o dono da academia pode fazer isso."), 409 `EMAIL_IN_USE` |
| `POST /gyms/me/members/:id/resend-invite` | **dono** | — | `204`; gera um link novo e invalida o anterior | 400 "Este membro já ativou a conta.", 403, 404 |
| `DELETE /gyms/me/members/:id` | **dono** | — | `204`; apaga o membro e derruba as sessões dele | 400 "O dono da academia não pode ser removido.", 403, 404 |

- O papel é lido do banco a cada requisição: se o dono remover alguém, as sessões dessa pessoa caem na hora.
- Todos os membros (dono e administradores) acessam o resto: dados da academia, profissionais e alunos.

### Convite de membro por link (página pública no web)
- O e-mail leva para `<WEB_ORIGIN>/aceitar-convite?token=<token>`. O link vale 72 horas e é de uso único.
- `POST /gyms/members/invite` `{ token }` → `200 { name, email, gymName, expiresAt }`.
- `POST /gyms/members/activate` `{ token, password, confirmPassword }` → `200 { member, gym, csrfToken }` + cookie (sem "lembrar"). **Já entra no painel.**
- Link inválido, expirado ou já usado: `400 INVALID_INVITE`, "Link inválido ou expirado. Peça um novo convite ao dono da academia."
- As duas rotas verificam o `Origin` (§2.7) e recebem o token no corpo.

### Profissionais da academia
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /gyms/me/professionals` | — | `200 [GymProfessional]`, ordenados por nome | — |
| `GET /gyms/me/professionals/:id` | — | `200 GymProfessionalDetail` | 404 |
| `POST /gyms/me/professionals` | `{ name, email, phone?, specialty? }` | `201 GymProfessional`; envia o link de convite (72 h) | 400, 409 `EMAIL_IN_USE` ("Este e-mail já pertence a uma conta.") |
| `POST /gyms/me/professionals/:id/resend-invite` | — | `204` | 400 "Este profissional já ativou a conta.", 404 |
| `DELETE /gyms/me/professionals/:id` | — | `204`; apaga a conta do profissional, e os alunos dele ficam com `professionalId = null` | 404 |

```ts
type GymProfessional = {
  id: string; name: string; email: string; phone: string | null; specialty: string | null;
  activated: boolean;      // já criou a senha
  studentsCount: number;
  createdAt: string;
};

type GymProfessionalDetail = GymProfessional & {
  bio: string | null;
  inviteExpiresAt: string | null;   // validade do convite atual; null se já ativou ou sem convite válido
  students: { id: string; name: string }[];  // alunos que ele orienta
};
```
- Contratar um profissional = `POST /gyms/me/professionals` só com `{ name, email }`. A conta nasce sem senha (`activated: false`) e o profissional recebe o link por e-mail.
- `resend-invite` gera um link novo; o anterior deixa de valer.
**Sai:** `PATCH /gyms/me/professionals/:id/approve`.

### Alunos da academia
Alunos matriculados nesta academia (relação "Matrícula" do DER). RNF05: a academia vê contato, vínculo e datas de treino, nunca a ficha de treino nem a avaliação física.

| Rota | Query | Sucesso | Erros |
|---|---|---|---|
| `GET /gyms/me/students` | `from?`, `to?` (ISO, os dois juntos) | `200 [GymStudent]`, ordenados por nome | 400 "Informe um período válido." |
| `POST /gyms/me/students` | corpo `{ email }` | `201 GymStudent` (sem `workoutsInRange`); matrícula com a data de hoje | 400 e-mail inválido ou "Esse e-mail é de um profissional, não de um aluno."; 404 "Nenhum aluno cadastrado com esse e-mail. Peça para ele criar a conta no app LSG FIT."; 409 `ALREADY_ENROLLED` (já é desta academia); 409 `ENROLLED_ELSEWHERE` (está em outra academia, que precisa cancelar antes) |
| `GET /gyms/me/students/:id` | — | `200 GymStudentDetail` | 404 |
| `GET /gyms/me/students/:id/workout-sessions` | `from`, `to` (obrigatórios) | `200 [WorkoutSession]`, do mais antigo para o mais recente | 400 período inválido, 404 |
| `DELETE /gyms/me/students/:id` | — | `204`; cancela a matrícula (`gymId` e `gymEnrolledAt` ficam null). O vínculo com o profissional não muda | 404 |

```ts
type WorkoutSession = { id: string; dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"; completedAt: string };

type GymStudent = {
  id: string; name: string; email: string; phone: string | null;
  gymEnrolledAt: string | null;                      // data da matrícula
  professional: { id: string; name: string } | null; // profissional que orienta
  lastWorkoutAt: string | null;                      // último treino concluído
  workoutsInRange?: number;                          // só com ?from=&to=: treinos no período (frequência)
  status: "ACTIVE" | "INACTIVE";                    // INACTIVE: não consegue fazer check-in
  inactiveReason: string | null;                     // motivo da inativação (o aluno vê no app)
  inactivatedAt: string | null;
};

type GymStudentDetail = Omit<GymStudent, "workoutsInRange"> & {
  totalWorkouts: number;          // todos os treinos concluídos
  workoutsLast30Days: number;
  recentWorkouts: WorkoutSession[]; // os 10 mais recentes, do mais recente para o mais antigo
};
```
- 404 "Aluno não encontrado nesta academia." também para id que não é UUID ou aluno de outra academia.
- **Matrícula:** só a academia matricula, pelo e-mail que o aluno usa no app. O aluno não escolhe academia no app; ele vê a academia (nome, telefone e endereço) no perfil depois de matriculado. Cadastro ainda não confirmado conta como inexistente (404).

### Inativar e reativar aluno
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /gyms/me/students/:id/deactivate` | `{ reason }` (obrigatório, até 300 caracteres) | `204`; cancela o check-in pendente dele | 400 sem motivo, 404 |
| `POST /gyms/me/students/:id/activate` | — | `204` | 404 |

- O aluno inativo continua usando o app (ficha, frequência, perfil), mas **não consegue fazer check-in** e vê o motivo ao tentar.
- Matricular de novo ou cancelar a matrícula limpa a inativação.

## 5.1 Check-in

Aluno **matriculado** precisa de check-in aprovado pela academia para treinar. Quem não tem academia treina direto.

```ts
type CheckIn = {
  id: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "CANCELLED";
  requestedAt: string;
  expiresAt: string | null;          // só PENDING: requestedAt + 15 min
  decidedAt: string | null;
  decidedBy: { id: string; name: string } | null;   // membro da academia
  denialReason: string | null;
  used: boolean;                     // já usado num treino concluído
  student: { id: string; name: string; email: string; professional: { id: string; name: string } | null };
};
```

**Regras**
- Pendente expira em **15 minutos** sem resposta (vira `EXPIRED`); o aluno pode pedir de novo.
- Aprovado vale **até o fim do dia** (fuso `APP_TIMEZONE`) e libera **um** treino: `POST /workout-sessions` exige check-in aprovado e não usado (senão `403 CHECK_IN_REQUIRED`) e liga o treino ao check-in.
- Um pedido pendente por vez; nada de check-in depois de já ter treinado no dia.

**Aluno (mobile, Bearer)**
| Rota | Sucesso | Erros |
|---|---|---|
| `GET /check-ins/today` | `200 { required, gym: { id, name } \| null, inactive: { reason, since } \| null, checkIn: CheckIn \| null, trainedToday }` | — |
| `POST /check-ins` | `201 CheckIn` (PENDING) | 400 `NO_GYM`; 403 `STUDENT_INACTIVE` (corpo traz também `reason`); 409 `CHECK_IN_PENDING`, `ALREADY_CHECKED_IN` ou `ALREADY_TRAINED_TODAY` |
| `DELETE /check-ins/today` | `200 CheckIn` (CANCELLED) | 404 sem pendente; 409 `CHECK_IN_ALREADY_DECIDED` |

O app consulta `GET /check-ins/today` a cada 3 s enquanto o pedido está pendente.

**Academia (web, cookie)**
| Rota | Sucesso | Erros |
|---|---|---|
| `GET /gyms/me/check-ins?status=&date=` | `200 [CheckIn]`, mais recentes primeiro; `date` = `aaaa-mm-dd` (padrão: hoje) | 400 |
| `GET /gyms/me/check-ins/stream` | SSE (ver abaixo) | 401 |
| `POST /gyms/me/check-ins/:id/approve` | `200 CheckIn` | 404; 409 `CHECK_IN_EXPIRED` ou `CHECK_IN_ALREADY_DECIDED` |
| `POST /gyms/me/check-ins/:id/deny` | corpo `{ reason? }` (até 300) → `200 CheckIn` | iguais ao approve |

**SSE `/gyms/me/check-ins/stream`**
- Abrir com `new EventSource(url, { withCredentials: true })` (o cookie `sid` autentica; sem CSRF por ser GET).
- Eventos: `ready` (ao conectar), `check-in.created` e `check-in.updated` (`data` = `CheckIn` em JSON; inclui aprovado, negado, cancelado e expirado, também quando outro membro decide), `session-expired` (a sessão acabou: ir para o login).
- Comentário `: ping` a cada 25 s; `retry: 5000` (o navegador reconecta sozinho). Ao reconectar, recarregue a lista com `GET /gyms/me/check-ins?status=PENDING`.
- Funciona com mais de um servidor (Redis pub/sub).

## 6. Rate limit
Usa Redis (`rate-limit-redis`), com chaves `rl:*` e o e-mail em `sha256` minúsculo. Os headers seguem o padrão `RateLimit` e `Retry-After`.

| Grupo | Rotas | Chave | Limite |
|---|---|---|---|
| Geral | todas, exceto os arquivos estáticos de `/media` (cache longo) | IP | 300 / min |
| Login (conta só falhas) | `POST /sessions`, `POST /gyms/sessions` | e-mail + IP | 5 / 15 min |
| | | e-mail | 20 / h |
| | | IP | 50 / h |
| Cadastro | `POST /users`, `POST /gyms` | IP | 10 / h |
| Envio de e-mail | `POST /users/forgot-password`, `POST /users/resend-verification`, `POST /gyms/forgot-password`, `POST /gyms/me/professionals`, `POST /gyms/me/professionals/:id/resend-invite`, `POST /gyms/me/members`, `POST /gyms/me/members/:id/resend-invite` | e-mail | 3 / 15 min |
| | | IP | 20 / h |
| Validação de código | `POST /users/verify`, `POST /users/reset-password`, `POST /users/activate/invite`, `POST /users/activate`, `POST /gyms/reset-password`, `POST /gyms/members/invite`, `POST /gyms/members/activate` | IP | 10 / 15 min |
| Autenticadas | rotas com sessão | conta | 120 / min |

- Resposta: `429` + `Retry-After: <s>` + `{ "message": "Muitas tentativas. Tente novamente em N minutos.", "code": "RATE_LIMITED" }`.
- Se o Redis falhar, o rate limit deixa a requisição passar e registra o erro.
- Nas rotas de envio de e-mail, o e-mail usado na chave é o do corpo (para convite, o do profissional; para reenvio de convite, o e-mail do profissional `:id`, ou a chave cai só no IP se não for prático).

## 7. Códigos (`auth_codes`)
| Finalidade | Validade | Dono |
|---|---|---|
| `EMAIL_VERIFICATION` | 15 min | aluno |
| `PASSWORD_RESET` | 15 min | aluno, profissional ativado ou membro da academia ativado |
| `PROFESSIONAL_INVITE` | 72 h | profissional não ativado |
| `GYM_MEMBER_INVITE` | 72 h | membro da academia não ativado |

- 6 dígitos, guardado como hash (`sha256`). Um código ativo por dono e finalidade (gerar um novo apaga o anterior).
- `PROFESSIONAL_INVITE` e `GYM_MEMBER_INVITE` são a exceção: em vez de 6 dígitos, um token aleatório de 256 bits enviado no link (também guardado como `sha256`). Sem limite de tentativas, porque não dá para adivinhar.
- No máximo 5 tentativas erradas. Na quinta, o código é apagado.
- Uso único: é apagado ao ser usado.
- Erro sempre "Código inválido ou expirado." (400), sem revelar se o e-mail existe.
