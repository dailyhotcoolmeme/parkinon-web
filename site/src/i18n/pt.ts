import type { Dict } from './en';

/*
 * Dicionário em português.
 *
 * Público-alvo: o Brasil. 90% dos falantes de português com 65 anos ou mais vivem no Brasil
 * (23,4 milhões, contra 2,6 milhões em Portugal), e Portugal está no EEE, onde não veiculamos
 * anúncios (ver docs/website-plan.md, 2026-09-02).
 * Por isso usa-se o português brasileiro: "você" em vez de "tu", e evita-se o vocabulário
 * exclusivo de Portugal (p. ex. "telemóvel", "ecrã", "casa de banho").
 *
 * As chaves devem corresponder exatamente às de en.ts — consulte esse arquivo para as regras
 * (aqui não entram nomes de instituições, números nem fatos específicos de um país).
 */
const pt: Dict = {
  'brand.name': 'ParkinON',
  'site.description': 'ParkinON — para tornar cada dia com a doença de Parkinson um pouco mais leve',

  'nav.news': 'Novidades',
  'nav.lifestyle': 'Dia a dia',
  'nav.clinical': 'Estudos clínicos e pesquisa',
  'nav.exercise': 'Vídeos de exercício',
  'exercise.tagline': 'Mexer o corpo um pouco todo dia já ajuda — vá no seu ritmo.',

  'nav.institutions': 'Direitos e apoios',
  'nav.tools': 'Ferramentas',

  'country.all': 'Todos',
  'country.kr': 'Coreia do Sul',
  'country.us': 'Estados Unidos',
  'country.jp': 'Japão',
  'country.fr': 'França',
  'country.de': 'Alemanha',
  'country.it': 'Itália',
  'country.au': 'Austrália',
  'country.ca': 'Canadá',
  'country.nz': 'Nova Zelândia',
  'phase.EARLY_PHASE1': 'Fase 1 inicial',
  'phase.PHASE1': 'Fase 1',
  'phase.PHASE2': 'Fase 2',
  'phase.PHASE3': 'Fase 3',
  'phase.PHASE4': 'Fase 4',
  'phase.NA': 'Não se aplica',

  'clinical.tagline': 'Veja os estudos clínicos sobre a doença de Parkinson que estão recrutando agora, por país, junto com a pesquisa relacionada.',
  'clinical.englishNotice': 'Estes são os estudos clínicos sobre a doença de Parkinson em andamento, a título de referência. Se algum parecer fazer sentido para você, converse com seu médico ou com a equipe de enfermagem.',
  'clinical.phase': 'Fase',
  'clinical.location': 'Local',
  'clinical.moreLocations': '+{n} outros locais',

  'phaseDesc.EARLY_PHASE1': 'Uma etapa exploratória antes da fase 1 comum, que observa como o medicamento se comporta no organismo com pouquíssimos participantes. Não tem finalidade de tratamento nem de diagnóstico.',
  'phaseDesc.PHASE1': 'Concentra-se na segurança do medicamento. Costuma ser feita com voluntários saudáveis e com um número pequeno de participantes.',
  'phaseDesc.PHASE2': 'Reúne os primeiros dados sobre se o medicamento funciona, sem deixar de acompanhar a segurança.',
  'phaseDesc.PHASE3': 'Reúne mais informações sobre segurança e eficácia comparando grupos e doses diferentes, com muito mais participantes.',
  'phaseDesc.PHASE4': 'Acontece depois da aprovação do medicamento, para reunir mais dados sobre segurança, eficácia ou a melhor forma de usá-lo.',
  'phaseDesc.NA': 'Um estudo sem fase de desenvolvimento de medicamento (por exemplo, um estudo sobre um dispositivo ou sobre comportamento).',
  'clinical.phaseHelp': 'O que significa essa fase?',
  'clinical.phaseMore': 'Saiba mais',
  'term.readMore': 'Saiba mais',
  'clinical.duration': 'Duração',
  'clinical.estimated': 'estimada',
  'clinical.recruiting': 'Recrutando',
  'clinical.closed': 'Recrutamento encerrado',
  'clinical.sponsor': 'Patrocinador',
  'clinical.contact': 'Contato',
  'clinical.viewOriginal': 'Ver no ClinicalTrials.gov',
  'clinical.noTrials': 'Por enquanto não encontramos estudos recrutando neste país.',
  'clinical.overflowNote': 'Mostrando os {shown} estudos atualizados mais recentemente, de um total de {total}.',
  'clinical.seeAll': 'Ver tudo no ClinicalTrials.gov',
  'clinical.disclaimer': 'Esta lista tem caráter apenas informativo. Se tiver interesse em participar de um estudo, converse primeiro com seu médico e entre em contato diretamente com a equipe da pesquisa.',
  'clinical.feedTrials': 'Estudos',

  'research.feedLabel': 'Pesquisa',
  'research.heading': 'Pesquisa relacionada',
  'research.tagline': 'Uma seleção das principais pesquisas sobre a doença de Parkinson. Critérios de seleção: estudos de fase III ou superior, metanálises, ou revistas médicas de primeira linha (Lancet Neurology, Brain, Movement Disorders, JAMA Neurology, Neurology).',
  'research.journal': 'Revista',
  'research.published': 'Publicado',
  'research.readAbstract': 'Ver o resumo no PubMed',
  'research.readFullText': 'Ler o texto completo',
  'research.paidNotice': 'O texto completo é pago (o acesso é liberado após a compra). O texto acima é o resumo na íntegra, como publicado pelos autores.',
  'research.translationPending': 'A tradução deste artigo ainda não está pronta. O resumo original (em inglês) está disponível no PubMed.',
  'research.disclaimer': 'Não aplique estes resultados diretamente ao seu tratamento nem às suas decisões de saúde. Leve suas dúvidas ao seu médico.',
  'research.noPapers': 'Por enquanto não há pesquisas novas que atendam aos critérios.',
  'research.overflowNote': 'Mostrando os {shown} mais recentes, de um total de {total}.',
  'research.seeAll': 'Ver tudo no PubMed',
  'research.pubtype.metaAnalysis': 'Metanálise',
  'research.pubtype.phase3': 'Estudo de fase III',
  'research.pubtype.phase4': 'Estudo de fase IV',
  'research.pubtype.rct': 'Estudo controlado randomizado',
  'research.pubtype.systematicReview': 'Revisão sistemática',
  'research.pubtype.observational': 'Estudo observacional',

  'search.placeholder': 'Buscar por título',
  'search.submit': 'Buscar',
  'search.clear': 'Limpar',
  'search.sectionArticles': 'Artigos',
  'search.loadMore': 'Ver mais',
  'search.noResults': 'Nenhum resultado encontrado.',
  'search.resultCount': '{n} resultados',
  'search.resultCountForQuery': '{n} resultados para “{q}”',
  'search.filter.anyPhase': 'Todas as fases',
  'search.filter.anyStatus': 'Todos os status',
  'search.filter.statusRecruiting': 'Recrutando',
  'search.filter.statusClosed': 'Recrutamento encerrado',
  'search.filter.startDate': 'Período',
  'search.filter.dateYearAny': 'Ano',
  'search.filter.dateMonthAny': 'Mês',
  'search.filter.dateYearUnit': '{n}',
  'search.filter.dateMonthUnit': '{n}',
  'search.filter.sponsor': 'Patrocinador',
  'search.filter.anyPubtype': 'Qualquer tipo de estudo',
  'search.filter.anyJournal': 'Qualquer revista',
  'search.filter.year': 'Ano de publicação',

  'date.yearMonth': '{m} {y}',
  'date.yearOnly': '{y}',

  'category.news': 'Novidades',
  'category.lifestyle': 'Dia a dia',
  'category.institutions': 'Direitos e apoios',

  'header.search': 'Buscar',
  'header.menu': 'Menu',
  'header.searchPlaceholder': 'Busque o que você precisa',

  'breadcrumb.home': 'Início',

  'ad.label': 'Publicidade',

  'side.tocTitle': 'Nesta página',
  'side.moreIn': 'Mais em {category}',

  'article.summaryTitle': 'Em resumo',
  'article.relatedTitle': 'Leia também',

  'notFound.title': 'Não encontramos esta página',
  'notFound.body': 'Pode ser que o endereço tenha mudado ou que a página não exista mais. Tente uma destas opções.',
  'notFound.home': 'Voltar ao início',

  'source.title': 'Fontes',
  'source.contact': 'Contato',

  'news.storyLabel': 'Notícia {index}',
  'news.sourceLink': 'Ler a matéria original ({name})',

  'home.todayRecommend': 'Escolha do dia, {m}/{d}',
  'home.todayDate': 'Hoje · {y}.{m}.{d}',
  'home.featureExpand': 'Ver o conteúdo completo',
  'home.featureCollapse': 'Mostrar menos',

  'app.promoTitle': 'Organize seus medicamentos pelo aplicativo',
  'app.promoBody':
    'O ParkinON lembra você da hora de tomar os medicamentos e guarda o histórico. Sua família também pode acompanhar como você está.',
  'app.shotAlt': 'O aplicativo ParkinON mostrando a situação dos medicamentos de hoje',

  'app.effectTracking.title': 'Registre também como você se sente no aplicativo',
  'app.effectTracking.body':
    'Anotar como está o corpo e o humor depois de cada dose, junto com o horário dos medicamentos, forma um histórico que ajuda a acompanhar como o tratamento está funcionando.',
  'app.effectTracking.alt': 'Aplicativo ParkinON - tela de registro do corpo e do humor',
  'app.exercise.title': 'Anote o exercício do dia no aplicativo',
  'app.exercise.body':
    'Manter um registro do exercício ajuda a não desistir, e também deixa quem acompanha você ver o quanto você tem se movimentado.',
  'app.exercise.alt': 'Aplicativo ParkinON - tela do registro de exercícios',
  'app.record.title': 'Anote também os sintomas no aplicativo',
  'app.record.body':
    'Manter um registro dos sintomas do dia a dia facilita muito descrever as mudanças na próxima consulta.',
  'app.record.alt': 'Aplicativo ParkinON - tela de registro e acompanhamento',
  'app.medRegistration.title': 'Cadastre seus medicamentos no aplicativo',
  'app.medRegistration.body':
    'Cadastrando o que você toma e em que horário, você vê tudo de uma vez em vez de manter uma lista à parte.',
  'app.medRegistration.alt': 'Aplicativo ParkinON - tela de cadastro de medicamentos',
  'app.family.title': 'Cuidem disso em família',
  'app.family.body':
    'Quando um de vocês registra alguma coisa, o outro também é avisado — para saber como o outro está, mesmo à distância.',
  'app.family.alt': 'Aplicativo ParkinON - tela de vínculo familiar',
  'app.reminder.title': 'Deixe o aplicativo lembrar você de tomar os medicamentos',
  'app.reminder.body':
    'Receba um aviso no horário que você escolher, e ao marcar a dose seu histórico se completa sozinho.',
  'app.reminder.alt': 'Aplicativo ParkinON - tela de horários e lembretes de medicamentos',
  'app.familyDiary.title': 'Compartilhem o dia em família',
  'app.familyDiary.body':
    'Escreva uma nota curta por dia, que depois pode ser reunida em um caderno, e a família também pode participar.',
  'app.familyDiary.alt': 'Aplicativo ParkinON - tela do diário da família',
  'app.community.title': 'Converse com quem vive algo parecido',
  'app.community.body':
    'Na comunidade de informação e troca do ParkinON, quem tem a doença de Parkinson e quem acompanha essas pessoas dividem suas experiências.',
  'app.community.alt': 'Aplicativo ParkinON - tela da comunidade de informação e troca',

  'medSchedule.deleteMed': 'Excluir {name}',

  'footer.quickLinks': 'Links rápidos',
  'footer.support': 'Atendimento',
  'footer.language': 'Idioma',
  'footer.privacyWeb': 'Aviso de privacidade',
  'footer.termsApp': 'Termos de uso do aplicativo',
  'footer.privacyApp': 'Aviso de privacidade do aplicativo',
  'footer.contact': 'Fale conosco',
  'footer.disclaimerLine1': 'As informações deste site não substituem uma avaliação médica.',
  'footer.disclaimerLine2': 'Consulte sempre seu médico antes de qualquer decisão sobre sua saúde.',
  'footer.bizInfo': 'Dados da empresa',
  'footer.bizNumber': 'N.º de registro da empresa',
  'footer.bizCeo': 'Representantes',
  'footer.bizMailOrder': 'N.º de venda a distância',
  'footer.bizAddress': 'Endereço',
  'footer.bizPhone': 'Telefone',
  'footer.bizEmail': 'E-mail',
  'footer.bizWebsite': 'Site',

  'lang.self': 'Português',
};

export default pt;
