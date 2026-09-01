const admin = require('firebase-admin');

// ⚠️ Certifique-se de ajustar o caminho para a chave da sua conta de serviço do Firebase
const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function atualizarEstatisticasMegaSena() {
  console.log("🔄 Iniciando processamento de estatísticas...");
  const estatisticasDezenas = {};
  
  // Inicializa o mapa com as 60 dezenas
  for (let i = 1; i <= 60; i++) {
    const dezenaStr = i.toString().padStart(2, '0');
    estatisticasDezenas[dezenaStr] = { dezena: i, frequencia: 0, ultimoConcurso: 0, atraso: 0 };
  }

  try {
    // Busca todo o histórico de sorteios da coleção mega_sena_resultados
    const snapshot = await db.collection('mega_sena_resultados').orderBy('concurso', 'asc').get();
    let ultimoConcurso = 0;

    snapshot.forEach(doc => {
      const sorteio = doc.data();
      ultimoConcurso = sorteio.concurso;
      
      if (Array.isArray(sorteio.dezenas)) {
        sorteio.dezenas.forEach(numero => {
           const dezenaStr = numero.toString().padStart(2, '0');
           if (estatisticasDezenas[dezenaStr]) {
               estatisticasDezenas[dezenaStr].frequencia += 1;
               estatisticasDezenas[dezenaStr].ultimoConcurso = ultimoConcurso;
           }
        });
      }
    });

    // Calcula o atraso atual de cada dezena
    Object.keys(estatisticasDezenas).forEach(key => {
      const dados = estatisticasDezenas[key];
      dados.atraso = ultimoConcurso - dados.ultimoConcurso;
    });

    // Salva o JSON consolidado em um único documento
    await db.collection('estatisticas').doc('mega_sena_atual').set({
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      ultimoConcursoProcessado: ultimoConcurso,
      totalSorteiosAnalisados: snapshot.size,
      dezenas: estatisticasDezenas
    });

    console.log(`✅ Sucesso! Documento gerado no Firestore. Último concurso processado: ${ultimoConcurso}`);
  } catch (error) {
    console.error("❌ Erro ao atualizar estatísticas:", error);
  }
}

atualizarEstatisticasMegaSena();