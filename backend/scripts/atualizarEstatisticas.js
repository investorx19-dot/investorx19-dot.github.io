const admin = require('firebase-admin');
const https = require('https');

// Caminho para a sua chave de serviço
const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Função para ligar diretamente à API Oficial da Caixa Económica
function buscarConcursoCaixa(concurso = '') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'servicebus2.caixa.gov.br',
      path: `/portaldeloterias/api/megasena/${concurso}`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      rejectUnauthorized: false // Evita bloqueios de certificado SSL da Caixa
    };

    https.get(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null); // Ignora erros e continua se a Caixa falhar num concurso
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function atualizarEstatisticasMegaSena() {
  console.log("🔄 A iniciar processamento de estatísticas...");
  
  const estatisticasDezenas = {};
  for (let i = 1; i <= 60; i++) {
    const dezenaStr = i.toString().padStart(2, '0');
    estatisticasDezenas[dezenaStr] = { dezena: i, frequencia: 0, ultimoConcurso: 0, atraso: 0 };
  }

  try {
    console.log("🌐 A conectar à API Oficial da Caixa...");
    
    // 1. Pega o sorteio mais recente para saber qual é o último concurso
    const ultimoSorteio = await buscarConcursoCaixa();
    if (!ultimoSorteio || !ultimoSorteio.numero) {
        throw new Error("Não foi possível conectar à API da Caixa. Tente novamente.");
    }

    const ultimoConcursoNum = ultimoSorteio.numero;
    console.log(`✅ Último concurso oficial: ${ultimoConcursoNum}`);
    console.log(`⏳ A baixar os últimos 200 sorteios para o Mapa de Calor (Tendências recentes)...`);

    // 2. Prepara os pedidos para os últimos 200 sorteios
    const promessas = [Promise.resolve(ultimoSorteio)];
    const qtdAnalisar = 200;

    for (let i = 1; i < qtdAnalisar; i++) {
       promessas.push(buscarConcursoCaixa(ultimoConcursoNum - i));
    }

    // 3. Executa todos os pedidos em simultâneo (muito rápido)
    const sorteios = await Promise.all(promessas);
    const sorteiosValidos = sorteios.filter(s => s && s.listaDezenas);

    console.log(`📊 ${sorteiosValidos.length} concursos baixados e processados!`);

    // 4. Contabiliza a frequência (invertemos para contar do mais antigo para o mais novo)
    sorteiosValidos.reverse().forEach(sorteio => {
      const numConcurso = sorteio.numero;

      if (Array.isArray(sorteio.listaDezenas)) {
        sorteio.listaDezenas.forEach(numero => {
          const dezenaStr = parseInt(numero, 10).toString().padStart(2, '0');
          if (estatisticasDezenas[dezenaStr]) {
            estatisticasDezenas[dezenaStr].frequencia += 1;
            estatisticasDezenas[dezenaStr].ultimoConcurso = numConcurso;
          }
        });
      }
    });

    // 5. Calcula o atraso final de cada número
    Object.keys(estatisticasDezenas).forEach(key => {
      const dados = estatisticasDezenas[key];
      // Se a dezena não saiu nestes últimos 200 sorteios, marcamos o atraso máximo
      dados.atraso = dados.ultimoConcurso === 0 
          ? qtdAnalisar 
          : ultimoConcursoNum - dados.ultimoConcurso;
    });

    // 6. Guarda os dados consolidados no Firebase
    await db.collection('estatisticas').doc('mega_sena_atual').set({
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      ultimoConcursoProcessado: ultimoConcursoNum,
      totalSorteiosAnalisados: sorteiosValidos.length,
      dezenas: estatisticasDezenas
    });

    console.log(`✅ Sucesso total! Firebase atualizado.`);

  } catch (error) {
    console.error("❌ Erro ao atualizar estatísticas:", error);
  }
}

atualizarEstatisticasMegaSena();