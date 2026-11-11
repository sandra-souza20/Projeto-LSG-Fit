// Seed: biblioteca padrao de exercicios + contas de teste.
//
// Contas de teste (todas com a senha "123456"):
//   Academia LSG Centro (web, POST /gyms/sessions)
//     academia@lsgfit.com   Marina Costa, dona (OWNER)
//     gerente@lsgfit.com    Rafael Nunes, administrador (ADMIN)
//   Profissionais da academia (mobile, POST /sessions)
//     ana@lsgfit.com        Ana Souza, ativada
//     bruno@lsgfit.com      Bruno Lima, ativado
//     carla@lsgfit.com      Carla Mendes, NAO ativada (sem senha). O link de
//                           convite e impresso no console ao rodar o seed; abra
//                           no app web para criar a senha.
//   Alunos (mobile, POST /sessions)
//     aluno@lsgfit.com      Diego Alves, matriculado na academia e orientado pela Ana
//     aluna@lsgfit.com      Elisa Rocha, sem academia e sem profissional
import "../src/env.js";
import { hash } from "argon2";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/database/prisma.js";
import type { Equipment } from "./client/enums.js";
import { activationLink } from "../src/services/send-professional-invite.service.js";
import { issueAuthToken } from "../src/utils/auth-code.js";

const SEED_PASSWORD = "123456";

const exercises = [
    // Peito
    {
        name: "Supino reto",
        muscleGroup: "Peito",
        equipment: ["BARBELL", "BENCH"] as Equipment[],
        instructions:
            "Deite no banco com os pés apoiados no chão. Segure a barra um pouco mais aberto que a largura dos ombros. Desça a barra controlada até tocar levemente o peito e empurre de volta até estender os braços, sem travar os cotovelos.",
    },
    {
        name: "Supino inclinado",
        muscleGroup: "Peito",
        equipment: ["DUMBBELL", "BENCH"] as Equipment[],
        instructions:
            "No banco inclinado (30-45°), segure um halter em cada mão na altura do peito. Empurre os halteres para cima até quase encostar um no outro, depois desça controlado até sentir alongamento no peito superior.",
    },
    {
        name: "Crucifixo",
        muscleGroup: "Peito",
        equipment: ["DUMBBELL", "BENCH"] as Equipment[],
        instructions:
            "Deitado no banco, braços estendidos acima do peito com leve flexão nos cotovelos. Abra os braços em arco até sentir alongamento no peito, depois volte à posição inicial contraindo o peitoral, sem deixar os cotovelos travarem.",
    },
    {
        name: "Peck deck",
        muscleGroup: "Peito",
        equipment: ["PEC_DECK"] as Equipment[],
        instructions:
            "Sente-se com as costas apoiadas e os braços nos apoios da máquina. Junte os braços à frente do peito de forma controlada, contraindo o peitoral, e volte devagar até sentir o alongamento.",
    },

    // Costas
    {
        name: "Puxada frontal",
        muscleGroup: "Costas",
        equipment: ["CABLE"] as Equipment[],
        instructions:
            "Sente-se com os joelhos presos no apoio e segure a barra mais aberto que os ombros. Puxe a barra até a altura do peito, levando os cotovelos para baixo e para trás, e retorne controlado até os braços quase estenderem.",
    },
    {
        name: "Remada curvada",
        muscleGroup: "Costas",
        equipment: ["BARBELL"] as Equipment[],
        instructions:
            "Incline o tronco para frente mantendo a coluna reta, joelhos levemente flexionados. Puxe a barra em direção ao abdômen, levando os cotovelos para trás, e desça controlado sem arredondar as costas.",
    },
    {
        name: "Remada baixa",
        muscleGroup: "Costas",
        equipment: ["CABLE"] as Equipment[],
        instructions:
            "Sentado, tronco ereto e joelhos levemente flexionados, segure o triângulo/barra. Puxe em direção ao abdômen mantendo os cotovelos próximos ao corpo, e retorne controlado esticando os braços sem curvar as costas.",
    },
    {
        name: "Barra fixa",
        muscleGroup: "Costas",
        equipment: ["PULL_UP_BAR"] as Equipment[],
        instructions:
            "Segure a barra com as mãos mais afastadas que os ombros, corpo estendido. Puxe o corpo para cima até o queixo passar da barra, contraindo as costas, e desça controlado até os braços estenderem por completo.",
    },

    // Pernas
    {
        name: "Agachamento livre",
        muscleGroup: "Pernas",
        equipment: ["BARBELL"] as Equipment[],
        instructions:
            "Barra apoiada na parte superior das costas, pés na largura dos ombros. Desça flexionando quadril e joelhos como se fosse sentar, mantendo o peito erguido e os joelhos alinhados com os pés, até as coxas ficarem paralelas ao chão. Suba empurrando o chão com os pés.",
    },
    {
        name: "Agachamento smith",
        muscleGroup: "Pernas",
        equipment: ["SMITH"] as Equipment[],
        instructions:
            "Posicione-se sob a barra do smith com os pés um pouco à frente do corpo. Desça controlado flexionando quadril e joelhos até formar cerca de 90°, mantendo a coluna neutra, e suba empurrando pelos calcanhares.",
    },
    {
        name: "Leg press",
        muscleGroup: "Pernas",
        equipment: ["LEG_PRESS"] as Equipment[],
        instructions:
            "Sente-se no aparelho com os pés na plataforma, na largura dos ombros. Solte as travas e desça controlado até formar cerca de 90° nos joelhos, sem tirar a lombar do encosto, depois empurre a plataforma sem travar os joelhos.",
    },
    {
        name: "Cadeira extensora",
        muscleGroup: "Pernas",
        equipment: ["LEG_EXTENSION"] as Equipment[],
        instructions:
            "Sente-se com os joelhos alinhados ao eixo da máquina e os tornozelos sob o apoio. Estenda as pernas até quase esticar por completo, contraindo o quadríceps, e desça controlado sem soltar o peso de uma vez.",
    },
    {
        name: "Mesa flexora",
        muscleGroup: "Pernas",
        equipment: ["LEG_CURL"] as Equipment[],
        instructions:
            "Deitado de bruços na máquina, com os tornozelos sob o apoio. Flexione os joelhos trazendo o apoio em direção aos glúteos, contraindo os posteriores da coxa, e retorne controlado até quase estender.",
    },
    {
        name: "Panturrilha em pé",
        muscleGroup: "Pernas",
        equipment: ["CALF_RAISE_MACHINE"] as Equipment[],
        instructions:
            "Apoie os ombros sob as almofadas e a ponta dos pés na plataforma. Suba o calcanhar o máximo possível contraindo a panturrilha, segure um instante e desça controlado até sentir o alongamento.",
    },

    // Ombro
    {
        name: "Desenvolvimento militar",
        muscleGroup: "Ombro",
        equipment: ["BARBELL"] as Equipment[],
        instructions:
            "Em pé ou sentado, segure a barra na altura dos ombros com as mãos um pouco mais abertas. Empurre a barra para cima até estender os braços por completo, sem jogar o tronco para trás, e desça controlada até a altura dos ombros.",
    },
    {
        name: "Elevação lateral",
        muscleGroup: "Ombro",
        equipment: ["DUMBBELL"] as Equipment[],
        instructions:
            "Em pé, um halter em cada mão ao lado do corpo, cotovelos levemente flexionados. Eleve os braços lateralmente até a altura dos ombros, sem usar impulso do tronco, e desça controlado.",
    },
    {
        name: "Elevação frontal",
        muscleGroup: "Ombro",
        equipment: ["DUMBBELL"] as Equipment[],
        instructions:
            "Em pé, halteres à frente das coxas. Eleve um braço (ou os dois) à frente do corpo até a altura dos ombros, mantendo leve flexão no cotovelo, e desça controlado sem balançar o tronco.",
    },

    // Bíceps
    {
        name: "Rosca direta",
        muscleGroup: "Bíceps",
        equipment: ["BARBELL"] as Equipment[],
        instructions:
            "Em pé, segure a barra com as mãos na largura dos ombros, braços estendidos e cotovelos fixos ao lado do corpo. Flexione os cotovelos elevando a barra até a altura do peito, contraindo o bíceps, e desça controlado sem balançar o tronco.",
    },
    {
        name: "Rosca alternada",
        muscleGroup: "Bíceps",
        equipment: ["DUMBBELL"] as Equipment[],
        instructions:
            "Em pé, um halter em cada mão ao lado do corpo. Flexione um braço por vez levando o halter até o ombro, girando o punho para cima, e desça controlado antes de repetir do outro lado.",
    },
    {
        name: "Rosca scott",
        muscleGroup: "Bíceps",
        equipment: ["BARBELL", "PREACHER_BENCH"] as Equipment[],
        instructions:
            "Apoie os braços no banco scott com as axilas encostadas na almofada. Flexione os cotovelos levando o peso em direção aos ombros, e estenda controlado sem tirar os braços do apoio.",
    },

    // Tríceps
    {
        name: "Tríceps pulley",
        muscleGroup: "Tríceps",
        equipment: ["CABLE"] as Equipment[],
        instructions:
            "Em pé de frente para a polia alta, cotovelos fixos ao lado do corpo. Estenda os antebraços para baixo até os braços ficarem retos, contraindo o tríceps, e volte controlado sem afastar os cotovelos do corpo.",
    },
    {
        name: "Tríceps testa",
        muscleGroup: "Tríceps",
        equipment: ["BARBELL", "BENCH"] as Equipment[],
        instructions:
            "Deitado no banco, segure a barra com os braços estendidos acima do peito. Flexione apenas os cotovelos descendo a barra em direção à testa, e estenda de volta contraindo o tríceps, mantendo os braços fixos.",
    },
    {
        name: "Tríceps corda",
        muscleGroup: "Tríceps",
        equipment: ["CABLE"] as Equipment[],
        instructions:
            "Em pé de frente para a polia alta, segure a corda com cotovelos fixos ao lado do corpo. Estenda os braços para baixo abrindo levemente as mãos no final do movimento, e volte controlado sem mover os cotovelos.",
    },

    // Abdômen
    {
        name: "Abdominal supra",
        muscleGroup: "Abdômen",
        equipment: ["MAT"] as Equipment[],
        instructions:
            "Deitado, joelhos flexionados e pés apoiados no chão. Flexione o tronco elevando os ombros em direção aos joelhos, contraindo o abdômen, sem puxar o pescoço com as mãos, e desça controlado.",
    },
    {
        name: "Prancha",
        muscleGroup: "Abdômen",
        equipment: ["MAT"] as Equipment[],
        instructions:
            "Apoie os antebraços e a ponta dos pés no chão, corpo em linha reta da cabeça aos calcanhares. Contraia o abdômen e os glúteos, mantendo a posição sem deixar o quadril subir ou cair.",
    },
];

// RF03/RF08: demonstracao visual de cada exercicio. As GIFs (180p) vem da versao
// gratuita do ExerciseDB (https://oss.exercisedb.dev/docs) e ficam em public/media/exercises,
// servidas pelo proprio servidor para nao depender da API deles em producao.
// Licenca: uso nao comercial (ok para o TCC) e com credito obrigatorio a AscendAPI,
// exibido no app abaixo da animacao. Uso comercial exige plano pago.
// O arquivo tem o nome do exercicio sem acentos (ex.: "Elevação lateral" -> elevacao-lateral.gif).
const MEDIA_DIR = fileURLToPath(new URL("../public/media/exercises/", import.meta.url));

function slugify(name: string) {
    return name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function gifUrlFor(name: string) {
    const file = `${slugify(name)}.gif`;
    if (!existsSync(path.join(MEDIA_DIR, file))) {
        console.warn(`Sem GIF para "${name}" (esperado public/media/exercises/${file}).`);
        return null;
    }
    // Caminho relativo: o app completa com o endereco do servidor (API_URL).
    return `/media/exercises/${file}`;
}

type SeedUser = {
    name: string;
    email: string;
    role: "STUDENT" | "PROFESSIONAL";
    // null: profissional ainda nao ativado (sem senha).
    password: string | null;
    gymId?: string | null;
    professionalId?: string | null;
    phone?: string | null;
    specialty?: string | null;
    bio?: string | null;
};

async function upsertUser(user: SeedUser) {
    const data = {
        name: user.name,
        role: user.role,
        password: user.password ? await hash(user.password) : null,
        emailVerified: user.password !== null,
        gymId: user.gymId ?? null,
        gymEnrolledAt: user.role === "STUDENT" && user.gymId ? new Date() : null,
        professionalId: user.professionalId ?? null,
        phone: user.phone ?? null,
        specialty: user.specialty ?? null,
        bio: user.bio ?? null,
    };

    return prisma.user.upsert({ where: { email: user.email }, create: { ...data, email: user.email }, update: data });
}

// Contas de teste (ver as senhas no topo do arquivo). Rodar o seed de novo
// restaura os dados abaixo.
async function seedAccounts() {
    const gymData = {
        name: "Academia LSG Centro",
        phone: "(11) 4000-1000",
        addressZipCode: "01310100",
        addressStreet: "Avenida Paulista",
        addressNumber: "1000",
        addressComplement: "Loja 2",
        addressDistrict: "Bela Vista",
        addressCity: "São Paulo",
        addressState: "SP",
    };

    // A academia e encontrada pelo dono (a academia em si nao tem e-mail).
    const owner = await prisma.gymMember.findUnique({ where: { email: "academia@lsgfit.com" }, select: { gymId: true } });
    const gym = owner
        ? await prisma.gym.update({ where: { id: owner.gymId }, data: gymData })
        : await prisma.gym.create({ data: gymData });

    const memberPassword = await hash(SEED_PASSWORD);
    for (const member of [
        { email: "academia@lsgfit.com", name: "Marina Costa", role: "OWNER" as const },
        { email: "gerente@lsgfit.com", name: "Rafael Nunes", role: "ADMIN" as const },
    ]) {
        const data = { gymId: gym.id, name: member.name, role: member.role, password: memberPassword };
        await prisma.gymMember.upsert({ where: { email: member.email }, create: { ...data, email: member.email }, update: data });
    }

    const ana = await upsertUser({
        name: "Ana Souza",
        email: "ana@lsgfit.com",
        role: "PROFESSIONAL",
        password: SEED_PASSWORD,
        gymId: gym.id,
        phone: "(11) 98888-0001",
        specialty: "Musculação",
        bio: "Personal trainer há 8 anos, foco em hipertrofia e iniciantes.",
    });

    await upsertUser({
        name: "Bruno Lima",
        email: "bruno@lsgfit.com",
        role: "PROFESSIONAL",
        password: SEED_PASSWORD,
        gymId: gym.id,
        phone: "(11) 98888-0002",
        specialty: "Funcional",
        bio: "Treino funcional e condicionamento.",
    });

    const carla = await upsertUser({
        name: "Carla Mendes",
        email: "carla@lsgfit.com",
        role: "PROFESSIONAL",
        password: null,
        gymId: gym.id,
        specialty: "Pilates",
    });

    await upsertUser({
        name: "Diego Alves",
        email: "aluno@lsgfit.com",
        role: "STUDENT",
        password: SEED_PASSWORD,
        gymId: gym.id,
        professionalId: ana.id,
        phone: "(11) 97777-0001",
    });

    await upsertUser({
        name: "Elisa Rocha",
        email: "aluna@lsgfit.com",
        role: "STUDENT",
        password: SEED_PASSWORD,
    });

    // Convite da profissional nao ativada: o token so existe aqui (no banco
    // fica o hash), entao o link e mostrado no console.
    const inviteToken = await issueAuthToken({ userId: carla.id }, "PROFESSIONAL_INVITE");

    console.log(`Contas de teste criadas (senha "${SEED_PASSWORD}").`);
    console.log(`Convite de carla@lsgfit.com: ${activationLink(inviteToken)}`);
}

async function main() {
    for (const base of exercises) {
        const exercise = { ...base, gifUrl: gifUrlFor(base.name) };
        const existing = await prisma.exercise.findFirst({ where: { name: exercise.name } });
        if (existing) {
            await prisma.exercise.update({ where: { id: existing.id }, data: exercise });
        } else {
            await prisma.exercise.create({ data: exercise });
        }
    }

    console.log(`Seed concluído: ${exercises.length} exercícios verificados/atualizados.`);

    await seedAccounts();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
