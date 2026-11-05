const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * 1. Regista um novo lead capturado e associa-o ao representante via ?ref=
 */
async function registarLeadComRef(req, res) {
  try {
    const { nome, email, tipo, codigoRef, telefone } = req.body;
    let representanteId = null;

    if (codigoRef) {
      const repSnapshot = await db.collection('crm_representantes')
        .where('codigoRef', '==', codigoRef)
        .limit(1)
        .get();

      if (!repSnapshot.empty) {
        representanteId = repSnapshot.docs[0].id;
      }
    }

    const novoLeadRef = await db.collection('crm_leads').add({
      nome: nome || 'Sem Nome',
      email: email || '',
      telefone: telefone || '',
      tipo: tipo || 'B2C',
      representanteId: representanteId,
      statusEstagio: 'Lead Recebido',
      criadoEm: new Date().toISOString()
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Lead registado com sucesso no CRM do Mark6!',
      leadId: novoLeadRef.id,
      atribuidoAoRepresentante: representanteId ? true : false
    });

  } catch (erro) {
    console.error('Erro ao registar lead no CRM:', erro);
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
}

/**
 * 2. Processa a comissão quando uma fatura é paga (B2C: 24m | B2B: 12m | Upsell)
 */
async function processarComissaoComUpsell({ subscricaoId, valorPagoFatura, statusPagamento }) {
  if (statusPagamento !== 'PAID' && statusPagamento !== 'CONFIRMED') {
    return { sucesso: false, motivo: 'Pagamento não confirmado' };
  }

  const subRef = db.collection('crm_subscricoes_comissoes').doc(subscricaoId);

  return await db.runTransaction(async (transaction) => {
    const subDoc = await transaction.get(subRef);

    if (!subDoc.exists) {
      return { sucesso: false, motivo: 'Subscrição/Regra de comissão não encontrada' };
    }

    const subData = subDoc.data();

    if (subData.status !== 'ativa') {
      return { sucesso: false, motivo: `Subscrição inativa ou cancelada (${subData.status})` };
    }

    if (subData.mesesPagosCount >= subData.mesesElegiveisTotal) {
      transaction.update(subRef, { status: 'concluida' });
      return { sucesso: false, motivo: 'Prazo limite de comissionamento atingido' };
    }

    const taxa = subData.taxaComissao || 0.15;
    const valorBaseCalculo = subData.valorBaseAtual || valorPagoFatura;
    const valorComissao = valorBaseCalculo * taxa;
    
    const proximaParcela = subData.mesesPagosCount + 1;

    const novaComissaoRef = db.collection('crm_comissoes_lancadas').doc();
    transaction.set(novaComissaoRef, {
      repId: subData.repId,
      subscricaoId: subscricaoId,
      tipoVenda: subData.tipoVenda,
      numeroParcela: proximaParcela,
      valorBase: valorBaseCalculo,
      valorComissao: valorComissao,
      statusComissao: 'pendente',
      dataGeracao: new Date().toISOString()
    });

    const dadosAtualizacao = {
      mesesPagosCount: admin.firestore.FieldValue.increment(1)
    };
    if (proximaParcela >= subData.mesesElegiveisTotal) {
      dadosAtualizacao.status = 'concluida';
    }
    transaction.update(subRef, dadosAtualizacao);

    const repRef = db.collection('crm_representantes').doc(subData.repId);
    transaction.update(repRef, {
      comissaoPendente: admin.firestore.FieldValue.increment(valorComissao)
    });

    return {
      sucesso: true,
      parcela: proximaParcela,
      valorComissaoGerada: valorComissao
    };
  });
}

/**
 * 3. Rota para registar Upsell
 */
async function registarUpsellCliente(req, res) {
  try {
    const { subscricaoId, novoValorPlano } = req.body;

    const subRef = db.collection('crm_subscricoes_comissoes').doc(subscricaoId);
    const subDoc = await subRef.get();

    if (!subDoc.exists) {
      return res.status(404).json({ sucesso: false, erro: 'Subscrição não encontrada' });
    }

    const dados = subDoc.data();
    const valorBaseAnterior = dados.valorBaseAtual || dados.valorBaseInicial;
    const valorIncremental = novoValorPlano - valorBaseAnterior;

    await subRef.update({
      valorBaseAtual: novoValorPlano,
      historicoAlteracoes: admin.firestore.FieldValue.arrayUnion({
        data: new Date().toISOString(),
        tipo: 'upsell',
        valorBaseAnterior: valorBaseAnterior,
        valorBaseNovo: novoValorPlano,
        incremento: valorIncremental > 0 ? valorIncremental : 0
      })
    });

    return res.json({
      sucesso: true,
      mensagem: 'Upsell registado com sucesso!'
    });

  } catch (erro) {
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
}

module.exports = {
  registarLeadComRef,
  processarComissaoComUpsell,
  registarUpsellCliente
};