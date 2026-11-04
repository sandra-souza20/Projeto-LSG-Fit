# Contrato da API — LSG FIT

Referência única para o servidor (`server/`), o app mobile (`mobile/`) e o app web da academia (repositório separado).
Qualquer mudança de contrato deve ser feita **aqui primeiro**.

## 1. Visão geral

| Conta | Onde usa | Tabela | Papel (`role`) | Transporte da sessão |
|---|---|---|---|---|
| Aluno | mobile | `users` | `STUDENT` | `Authorization: Bearer <token>` |
| Profissional | mobile | `users` | `PROFESSIONAL` | `Authorization: Bearer <token>` |
| Academia | web | `gyms` | `GYM` | cookie `sid` (HttpOnly) + `X-CSRF-Token` |

- Aluno e profissional usam o **mesmo login**. O backend decide o papel.
- Só a academia cadastra profissionais. O aluno se cadastra sozinho. A academia se cadastra livremente.
- Um papel por conta. Um e-mail pertence a uma única conta, seja `users` ou `gyms`.
- A academia **nunca** acessa avaliações físicas (RNF05).

### Formato de erro
Todo erro responde `{ "message": string, "code"?: string }`.

| Status | `code` | Quando |
|---|---|---|
| 400 | — | dados inválidos (mensagem descreve) |
| 401 | `SESSION_EXPIRED` | sem sessão, sessão expirada, revogada ou token reutilizado após rotação |
| 401 | — | credenciais inválidas no login ("E-mail ou senha inválidos.") |
| 403 | `EMAIL_NOT_VERIFIED` | aluno tenta entrar sem confirmar o e-mail |
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
| `session:<sessionId>` | `{ accountType: "user"\|"gym", accountId, role, transport: "cookie"\|"bearer", csrfToken?, remember, createdAt, rotatedAt, lastActiveAt, userAgent, deviceName, ip }` |
| `session-token:<sha256(token)>` | `sessionId` |
| `account-sessions:<user\|gym>:<accountId>` | conjunto de `sessionId` ativos |

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
```
- Sem "lembrar": sem `Max-Age`, o cookie some ao fechar o navegador.
- `Secure` desligado quando `COOKIE_SECURE=false` (desenvolvimento).
- Logout ou revogação da sessão atual: `Set-Cookie: sid=; Max-Age=0; ...`.

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
- `csrfToken` é gerado com a sessão e vale enquanto ela durar.
- `POST`, `PATCH`, `PUT` e `DELETE` autenticados por cookie exigem `X-CSRF-Token` igual ao da sessão **e** `Origin` igual a `WEB_ORIGIN`. Se não, 403 `CSRF_INVALID`.
- As rotas públicas da academia que criam sessão (`POST /gyms`, `POST /gyms/sessions`, `POST /gyms/reset-password`) e `POST /gyms/forgot-password` recusam com 403 `CSRF_INVALID` quando o header `Origin` estiver presente e for diferente de `WEB_ORIGIN`.
- CORS: `origin: WEB_ORIGIN`, `credentials: true`. O mobile não envia `Origin` e não é afetado.

### 2.8 Variáveis de ambiente
| Variável | Exemplo |
|---|---|
| `REDIS_URL` | `redis://:senha@192.168.1.8:6379` |
| `WEB_ORIGIN` | `http://localhost:5173` |
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
| Profissional sem senha | 403 `ACCOUNT_NOT_ACTIVATED` | "Conta ainda não ativada. Use o código enviado para o seu e-mail." |

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
- `deviceName` vem do `X-Device-Name` enviado na criação da sessão (mobile).
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
  gym: { id: string; name: string } | null;
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
| `POST /users` (só aluno) | `{ name, email, password, confirmPassword, gymId? }` | `201 { user, message }`. Com `EMAIL_VERIFICATION=off`: `201 { user, message, token, sessionId }` | 400 senhas diferentes, 409 `EMAIL_IN_USE` |
| `POST /users/verify` | `{ email, code }` | `200 { user, token, sessionId }` | 400 "Código inválido ou expirado." |
| `POST /users/resend-verification` | `{ email }` | `200 { message }` (genérica) | — |
| `POST /users/forgot-password` | `{ email }` | `200 { message }` (sempre a mesma) | — |
| `POST /users/reset-password` | `{ email, code, password, confirmPassword }` | `200 { user, token, sessionId }` | 400 senhas diferentes ou código inválido |
| `POST /users/activate` (profissional, 1º acesso) | `{ email, code, password, confirmPassword }` | `200 { user, token, sessionId }` | 400 senhas diferentes ou código inválido |

- `forgot-password` envia o código de redefinição (`PASSWORD_RESET`, 15 min). Se a conta for de um **profissional ainda não ativado**, envia um novo código de convite (`PROFESSIONAL_INVITE`, 72 h).
- `activate` só funciona para profissional sem senha. Cria a senha, marca `emailVerified = true`, cria a sessão e revoga as outras.
- `reset-password` recusa profissional sem senha (responde como código inválido).
- Mensagem genérica de `forgot-password`: "Se o e-mail existir, um código de redefinição foi enviado."
- Os headers `X-Device-Name` valem em todas as rotas que criam sessão.

### Perfil
| Rota | Papel | Corpo | Sucesso |
|---|---|---|---|
| `GET /users/me` | STUDENT, PROFESSIONAL | — | `200 User` |
| `PATCH /users/me` | STUDENT, PROFESSIONAL | `{ name?, phone? }` e, se profissional, `{ specialty?, bio? }` | `200 User` |
| `PATCH /users/me/professional` | STUDENT | `{ professionalId: string \| null }` | `200 User` |
| `PATCH /users/me/gym` | STUDENT | `{ gymId: string \| null }` | `200 User` |

O profissional **não** troca de academia. Os campos `gymId` e `role` são ignorados no `PATCH /users/me`.

### Profissionais
| Rota | Papel | Sucesso |
|---|---|---|
| `GET /professionals` | autenticado | `200 [{ id, name, email, phone, specialty, bio, gymId, gym, studentsCount }]`, só profissionais ativados, ordenados por nome |
| `GET /professionals/students` | PROFESSIONAL | sem mudança de formato |
| `GET /professionals/students/:studentId/workout-sessions` | PROFESSIONAL | sem mudança |
| `/professionals/students/:studentId/workout-plan` (GET, POST, PATCH `/:id`, DELETE `/:id`) | PROFESSIONAL | sem mudança |
| `/professionals/students/:studentId/physical-assessments` (GET, POST) | PROFESSIONAL | sem mudança |

**Saem:** `POST /professionals`, `POST /professionals/sessions`, `GET /professionals/me` e `PATCH /professionals/me`. O perfil do profissional passa a ser `/users/me`.

As demais rotas do aluno (`/workout-plan`, `/workout-sessions`, `/physical-assessments`, `/exercises`) não mudam de formato.

## 5. Academia (web)

### Tipo `Gym`
```ts
type Gym = { id: string; name: string; email: string; phone: string | null; address: string | null; createdAt: string; updatedAt: string };
```

### Autenticação
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /gyms` | `{ name, email, password, confirmPassword, phone?, address? }` | `201 { gym, csrfToken }` + cookie (sem "lembrar") | 400 senhas diferentes, 409 `EMAIL_IN_USE` |
| `POST /gyms/sessions` | `{ email, password, rememberDevice?: boolean }` | `200 { gym, csrfToken }` + cookie | 401 "E-mail ou senha inválidos." |
| `GET /gyms/me` | — | `200 Gym` | 401 |
| `PATCH /gyms/me` | `{ name?, phone?, address? }` | `200 Gym` | 400 |
| `POST /gyms/forgot-password` | `{ email }` | `200 { message }` (sempre a mesma) | — |
| `POST /gyms/reset-password` | `{ email, code, password, confirmPassword }` | `200 { gym, csrfToken }` + cookie (sem "lembrar"); revoga as outras sessões | 400 |
| `GET /gyms` (público) | — | `200 [{ id, name, email, phone, address }]`, sem mudança (o mobile usa `phone`) | — |

### Profissionais da academia
| Rota | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /gyms/me/professionals` | — | `200 [GymProfessional]` | — |
| `POST /gyms/me/professionals` | `{ name, email, phone?, specialty? }` | `201 GymProfessional`; envia código de convite (72 h) | 400, 409 `EMAIL_IN_USE` ("Este e-mail já pertence a uma conta.") |
| `POST /gyms/me/professionals/:id/resend-invite` | — | `204` | 400 "Este profissional já ativou a conta.", 404 |
| `DELETE /gyms/me/professionals/:id` | — | `204`; apaga a conta do profissional, e os alunos dele ficam com `professionalId = null` | 404 |

```ts
type GymProfessional = {
  id: string; name: string; email: string; phone: string | null; specialty: string | null;
  activated: boolean;      // já criou a senha
  studentsCount: number;
  createdAt: string;
};
```
**Sai:** `PATCH /gyms/me/professionals/:id/approve`.

### Alunos da academia (sem mudança de formato)
`GET /gyms/me/students`, `GET /gyms/me/students/:studentId/workout-sessions` e `DELETE /gyms/me/students/:studentId`.

## 6. Rate limit
Usa Redis (`rate-limit-redis`), com chaves `rl:*` e o e-mail em `sha256` minúsculo. Os headers seguem o padrão `RateLimit` e `Retry-After`.

| Grupo | Rotas | Chave | Limite |
|---|---|---|---|
| Geral | todas, exceto os arquivos estáticos de `/media` (cache longo) | IP | 300 / min |
| Login (conta só falhas) | `POST /sessions`, `POST /gyms/sessions` | e-mail + IP | 5 / 15 min |
| | | e-mail | 20 / h |
| | | IP | 50 / h |
| Cadastro | `POST /users`, `POST /gyms` | IP | 10 / h |
| Envio de e-mail | `POST /users/forgot-password`, `POST /users/resend-verification`, `POST /gyms/forgot-password`, `POST /gyms/me/professionals`, `POST /gyms/me/professionals/:id/resend-invite` | e-mail | 3 / 15 min |
| | | IP | 20 / h |
| Validação de código | `POST /users/verify`, `POST /users/reset-password`, `POST /users/activate`, `POST /gyms/reset-password` | IP | 10 / 15 min |
| Autenticadas | rotas com sessão | conta | 120 / min |

- Resposta: `429` + `Retry-After: <s>` + `{ "message": "Muitas tentativas. Tente novamente em N minutos.", "code": "RATE_LIMITED" }`.
- Se o Redis falhar, o rate limit deixa a requisição passar e registra o erro.
- Nas rotas de envio de e-mail, o e-mail usado na chave é o do corpo (para convite, o do profissional; para reenvio de convite, o e-mail do profissional `:id`, ou a chave cai só no IP se não for prático).

## 7. Códigos (`auth_codes`)
| Finalidade | Validade | Dono |
|---|---|---|
| `EMAIL_VERIFICATION` | 15 min | aluno |
| `PASSWORD_RESET` | 15 min | aluno, profissional ativado ou academia |
| `PROFESSIONAL_INVITE` | 72 h | profissional não ativado |

- 6 dígitos, guardado como hash (`sha256`). Um código ativo por dono e finalidade (gerar um novo apaga o anterior).
- No máximo 5 tentativas erradas. Na quinta, o código é apagado.
- Uso único: é apagado ao ser usado.
- Erro sempre "Código inválido ou expirado." (400), sem revelar se o e-mail existe.
