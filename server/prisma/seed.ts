import "../src/env.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/database/prisma.js";

const exercises = [
    // Peito
    {
        name: "Supino reto",
        muscleGroup: "Peito",
        equipment: "Barra",
        instructions:
            "Deite no banco com os pés apoiados no chão. Segure a barra um pouco mais aberto que a largura dos ombros. Desça a barra controlada até tocar levemente o peito e empurre de volta até estender os braços, sem travar os cotovelos.",
    },
    {
        name: "Supino inclinado",
        muscleGroup: "Peito",
        equipment: "Halteres",
        instructions:
            "No banco inclinado (30-45°), segure um halter em cada mão na altura do peito. Empurre os halteres para cima até quase encostar um no outro, depois desça controlado até sentir alongamento no peito superior.",
    },
    {
        name: "Crucifixo",
        muscleGroup: "Peito",
        equipment: "Halteres",
        instructions:
            "Deitado no banco, braços estendidos acima do peito com leve flexão nos cotovelos. Abra os braços em arco até sentir alongamento no peito, depois volte à posição inicial contraindo o peitoral, sem deixar os cotovelos travarem.",
    },
    {
        name: "Peck deck",
        muscleGroup: "Peito",
        equipment: "Máquina",
        instructions:
            "Sente-se com as costas apoiadas e os braços nos apoios da máquina. Junte os braços à frente do peito de forma controlada, contraindo o peitoral, e volte devagar até sentir o alongamento.",
    },

    // Costas
    {
        name: "Puxada frontal",
        muscleGroup: "Costas",
        equipment: "Polia",
        instructions:
            "Sente-se com os joelhos presos no apoio e segure a barra mais aberto que os ombros. Puxe a barra até a altura do peito, levando os cotovelos para baixo e para trás, e retorne controlado até os braços quase estenderem.",
    },
    {
        name: "Remada curvada",
        muscleGroup: "Costas",
        equipment: "Barra",
        instructions:
            "Incline o tronco para frente mantendo a coluna reta, joelhos levemente flexionados. Puxe a barra em direção ao abdômen, levando os cotovelos para trás, e desça controlado sem arredondar as costas.",
    },
    {
        name: "Remada baixa",
        muscleGroup: "Costas",
        equipment: "Polia",
        instructions:
            "Sentado, tronco ereto e joelhos levemente flexionados, segure o triângulo/barra. Puxe em direção ao abdômen mantendo os cotovelos próximos ao corpo, e retorne controlado esticando os braços sem curvar as costas.",
    },
    {
        name: "Barra fixa",
        muscleGroup: "Costas",
        equipment: "Peso corporal",
        instructions:
            "Segure a barra com as mãos mais afastadas que os ombros, corpo estendido. Puxe o corpo para cima até o queixo passar da barra, contraindo as costas, e desça controlado até os braços estenderem por completo.",
    },

    // Pernas
    {
        name: "Agachamento livre",
        muscleGroup: "Pernas",
        equipment: "Barra",
        instructions:
            "Barra apoiada na parte superior das costas, pés na largura dos ombros. Desça flexionando quadril e joelhos como se fosse sentar, mantendo o peito erguido e os joelhos alinhados com os pés, até as coxas ficarem paralelas ao chão. Suba empurrando o chão com os pés.",
    },
    {
        name: "Agachamento smith",
        muscleGroup: "Pernas",
        equipment: "Smith",
        instructions:
            "Posicione-se sob a barra do smith com os pés um pouco à frente do corpo. Desça controlado flexionando quadril e joelhos até formar cerca de 90°, mantendo a coluna neutra, e suba empurrando pelos calcanhares.",
    },
    {
        name: "Leg press",
        muscleGroup: "Pernas",
        equipment: "Máquina",
        instructions:
            "Sente-se no aparelho com os pés na plataforma, na largura dos ombros. Solte as travas e desça controlado até formar cerca de 90° nos joelhos, sem tirar a lombar do encosto, depois empurre a plataforma sem travar os joelhos.",
    },
    {
        name: "Cadeira extensora",
        muscleGroup: "Pernas",
        equipment: "Máquina",
        instructions:
            "Sente-se com os joelhos alinhados ao eixo da máquina e os tornozelos sob o apoio. Estenda as pernas até quase esticar por completo, contraindo o quadríceps, e desça controlado sem soltar o peso de uma vez.",
    },
    {
        name: "Mesa flexora",
        muscleGroup: "Pernas",
        equipment: "Máquina",
        instructions:
            "Deitado de bruços na máquina, com os tornozelos sob o apoio. Flexione os joelhos trazendo o apoio em direção aos glúteos, contraindo os posteriores da coxa, e retorne controlado até quase estender.",
    },
    {
        name: "Panturrilha em pé",
        muscleGroup: "Pernas",
        equipment: "Máquina",
        instructions:
            "Apoie os ombros sob as almofadas e a ponta dos pés na plataforma. Suba o calcanhar o máximo possível contraindo a panturrilha, segure um instante e desça controlado até sentir o alongamento.",
    },

    // Ombro
    {
        name: "Desenvolvimento militar",
        muscleGroup: "Ombro",
        equipment: "Barra",
        instructions:
            "Em pé ou sentado, segure a barra na altura dos ombros com as mãos um pouco mais abertas. Empurre a barra para cima até estender os braços por completo, sem jogar o tronco para trás, e desça controlada até a altura dos ombros.",
    },
    {
        name: "Elevação lateral",
        muscleGroup: "Ombro",
        equipment: "Halteres",
        instructions:
            "Em pé, um halter em cada mão ao lado do corpo, cotovelos levemente flexionados. Eleve os braços lateralmente até a altura dos ombros, sem usar impulso do tronco, e desça controlado.",
    },
    {
        name: "Elevação frontal",
        muscleGroup: "Ombro",
        equipment: "Halteres",
        instructions:
            "Em pé, halteres à frente das coxas. Eleve um braço (ou os dois) à frente do corpo até a altura dos ombros, mantendo leve flexão no cotovelo, e desça controlado sem balançar o tronco.",
    },

    // Bíceps
    {
        name: "Rosca direta",
        muscleGroup: "Bíceps",
        equipment: "Barra",
        instructions:
            "Em pé, segure a barra com as mãos na largura dos ombros, braços estendidos e cotovelos fixos ao lado do corpo. Flexione os cotovelos elevando a barra até a altura do peito, contraindo o bíceps, e desça controlado sem balançar o tronco.",
    },
    {
        name: "Rosca alternada",
        muscleGroup: "Bíceps",
        equipment: "Halteres",
        instructions:
            "Em pé, um halter em cada mão ao lado do corpo. Flexione um braço por vez levando o halter até o ombro, girando o punho para cima, e desça controlado antes de repetir do outro lado.",
    },
    {
        name: "Rosca scott",
        muscleGroup: "Bíceps",
        equipment: "Máquina",
        instructions:
            "Apoie os braços no banco scott com as axilas encostadas na almofada. Flexione os cotovelos levando o peso em direção aos ombros, e estenda controlado sem tirar os braços do apoio.",
    },

    // Tríceps
    {
        name: "Tríceps pulley",
        muscleGroup: "Tríceps",
        equipment: "Polia",
        instructions:
            "Em pé de frente para a polia alta, cotovelos fixos ao lado do corpo. Estenda os antebraços para baixo até os braços ficarem retos, contraindo o tríceps, e volte controlado sem afastar os cotovelos do corpo.",
    },
    {
        name: "Tríceps testa",
        muscleGroup: "Tríceps",
        equipment: "Barra",
        instructions:
            "Deitado no banco, segure a barra com os braços estendidos acima do peito. Flexione apenas os cotovelos descendo a barra em direção à testa, e estenda de volta contraindo o tríceps, mantendo os braços fixos.",
    },
    {
        name: "Tríceps corda",
        muscleGroup: "Tríceps",
        equipment: "Polia",
        instructions:
            "Em pé de frente para a polia alta, segure a corda com cotovelos fixos ao lado do corpo. Estenda os braços para baixo abrindo levemente as mãos no final do movimento, e volte controlado sem mover os cotovelos.",
    },

    // Abdômen
    {
        name: "Abdominal supra",
        muscleGroup: "Abdômen",
        equipment: "Peso corporal",
        instructions:
            "Deitado, joelhos flexionados e pés apoiados no chão. Flexione o tronco elevando os ombros em direção aos joelhos, contraindo o abdômen, sem puxar o pescoço com as mãos, e desça controlado.",
    },
    {
        name: "Prancha",
        muscleGroup: "Abdômen",
        equipment: "Peso corporal",
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
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
