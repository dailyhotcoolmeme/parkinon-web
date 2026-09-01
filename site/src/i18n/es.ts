import type { Dict } from './en';

/*
 * Diccionario en español.
 *
 * Público objetivo: hispanohablantes fuera del EEE — América Latina (México, Argentina,
 * Colombia, Chile, Perú…) y la población hispana de Estados Unidos. España queda fuera del
 * alcance por ahora (ver docs/website-plan.md, 2026-09-02).
 * Por eso se usa un español neutro latinoamericano: "usted" en lugar de "vos", y se evita
 * el vocabulario exclusivo de España (p. ej. "móvil", "ordenador", "coger").
 *
 * Las claves deben coincidir exactamente con las de en.ts — consulte ese archivo para las
 * reglas (aquí no van nombres de instituciones, cifras ni datos propios de un país).
 */
const es: Dict = {
  'brand.name': 'ParkinON',
  'site.description': 'ParkinON — para que cada día con la enfermedad de Parkinson sea un poco más llevadero',

  'nav.news': 'Novedades',
  'nav.lifestyle': 'Vida diaria',
  'nav.clinical': 'Ensayos clínicos e investigación',
  'nav.exercise': 'Videos de ejercicio',
  'exercise.tagline': 'Moverse un poco cada día puede aliviarle el cuerpo — vaya a su propio ritmo.',

  'nav.institutions': 'Ayudas y apoyos',
  'nav.tools': 'Herramientas',

  'country.all': 'Todos',
  'country.kr': 'Corea del Sur',
  'country.us': 'Estados Unidos',
  'country.jp': 'Japón',
  'country.fr': 'Francia',
  'country.de': 'Alemania',
  'country.it': 'Italia',
  'country.au': 'Australia',
  'country.ca': 'Canadá',
  'country.nz': 'Nueva Zelanda',
  'phase.EARLY_PHASE1': 'Fase 1 temprana',
  'phase.PHASE1': 'Fase 1',
  'phase.PHASE2': 'Fase 2',
  'phase.PHASE3': 'Fase 3',
  'phase.PHASE4': 'Fase 4',
  'phase.NA': 'No aplica',

  'clinical.tagline': 'Consulte los ensayos clínicos sobre la enfermedad de Parkinson que están reclutando ahora, por país, junto con la investigación relacionada.',
  'clinical.englishNotice': 'Estos son los ensayos clínicos sobre la enfermedad de Parkinson que están en marcha, a modo de referencia. Si alguno le parece pertinente, coméntelo con su médico o su personal de enfermería.',
  'clinical.phase': 'Fase',
  'clinical.location': 'Lugar',
  'clinical.moreLocations': '+{n} lugares más',

  'phaseDesc.EARLY_PHASE1': 'Una etapa exploratoria previa a la fase 1 habitual, que observa cómo se comporta el medicamento en el organismo con muy pocos participantes. No tiene finalidad terapéutica ni diagnóstica.',
  'phaseDesc.PHASE1': 'Se centra en la seguridad del medicamento. Suele realizarse con voluntarios sanos y con un número reducido de participantes.',
  'phaseDesc.PHASE2': 'Reúne los primeros datos sobre si el medicamento funciona, sin dejar de vigilar la seguridad.',
  'phaseDesc.PHASE3': 'Reúne más información sobre seguridad y eficacia comparando distintos grupos y dosis, con muchos más participantes.',
  'phaseDesc.PHASE4': 'Se lleva a cabo después de la aprobación del medicamento, para reunir más datos sobre seguridad, eficacia o la mejor forma de usarlo.',
  'phaseDesc.NA': 'Un ensayo sin fase de desarrollo farmacológico (por ejemplo, un estudio sobre un dispositivo o sobre la conducta).',
  'clinical.phaseHelp': '¿Qué significa esta fase?',
  'clinical.phaseMore': 'Saber más',
  'term.readMore': 'Saber más',
  'clinical.duration': 'Duración',
  'clinical.estimated': 'estimada',
  'clinical.recruiting': 'Reclutando',
  'clinical.closed': 'Reclutamiento cerrado',
  'clinical.sponsor': 'Patrocinador',
  'clinical.contact': 'Contacto',
  'clinical.viewOriginal': 'Ver en ClinicalTrials.gov',
  'clinical.noTrials': 'Por ahora no se encontraron ensayos reclutando en este país.',
  'clinical.overflowNote': 'Se muestran los {shown} ensayos actualizados más recientemente de un total de {total}.',
  'clinical.seeAll': 'Ver todo en ClinicalTrials.gov',
  'clinical.disclaimer': 'Esta lista es solo informativa. Si le interesa participar en un ensayo, hable primero con su médico y comuníquese directamente con el equipo del estudio.',
  'clinical.feedTrials': 'Ensayos',

  'research.feedLabel': 'Investigación',
  'research.heading': 'Investigación relacionada',
  'research.tagline': 'Una selección de la investigación más relevante sobre la enfermedad de Parkinson. Criterios de selección: ensayos de fase III o superior, metaanálisis, o revistas médicas de primer nivel (Lancet Neurology, Brain, Movement Disorders, JAMA Neurology, Neurology).',
  'research.journal': 'Revista',
  'research.published': 'Publicado',
  'research.readAbstract': 'Ver el resumen en PubMed',
  'research.readFullText': 'Leer el texto completo',
  'research.paidNotice': 'El texto completo es de pago (se accede tras la compra). El texto anterior es el resumen íntegro tal como lo publicaron los autores.',
  'research.translationPending': 'La traducción de este artículo aún no está lista. El resumen original (en inglés) está disponible en PubMed.',
  'research.disclaimer': 'No aplique estos resultados directamente a su tratamiento ni a sus decisiones de salud. Consulte cualquier duda con su médico.',
  'research.noPapers': 'Por ahora no hay investigación nueva que cumpla los criterios.',
  'research.overflowNote': 'Se muestran los {shown} más recientes de un total de {total}.',
  'research.seeAll': 'Ver todo en PubMed',
  'research.pubtype.metaAnalysis': 'Metaanálisis',
  'research.pubtype.phase3': 'Ensayo de fase III',
  'research.pubtype.phase4': 'Ensayo de fase IV',
  'research.pubtype.rct': 'Ensayo controlado aleatorizado',
  'research.pubtype.systematicReview': 'Revisión sistemática',
  'research.pubtype.observational': 'Estudio observacional',

  'search.placeholder': 'Buscar por título',
  'search.submit': 'Buscar',
  'search.clear': 'Borrar',
  'search.sectionArticles': 'Artículos',
  'search.loadMore': 'Ver más',
  'search.noResults': 'No se encontraron resultados.',
  'search.resultCount': '{n} resultados',
  'search.resultCountForQuery': '{n} resultados para «{q}»',
  'search.filter.anyPhase': 'Todas las fases',
  'search.filter.anyStatus': 'Todos los estados',
  'search.filter.statusRecruiting': 'Reclutando',
  'search.filter.statusClosed': 'Reclutamiento cerrado',
  'search.filter.startDate': 'Periodo',
  'search.filter.dateYearAny': 'Año',
  'search.filter.dateMonthAny': 'Mes',
  'search.filter.dateYearUnit': '{n}',
  'search.filter.dateMonthUnit': '{n}',
  'search.filter.sponsor': 'Patrocinador',
  'search.filter.anyPubtype': 'Cualquier tipo de estudio',
  'search.filter.anyJournal': 'Cualquier revista',
  'search.filter.year': 'Año de publicación',

  'date.yearMonth': '{m} {y}',
  'date.yearOnly': '{y}',

  'category.news': 'Novedades',
  'category.lifestyle': 'Vida diaria',
  'category.institutions': 'Ayudas y apoyos',

  'header.search': 'Buscar',
  'header.menu': 'Menú',
  'header.searchPlaceholder': 'Busque lo que necesita',

  'breadcrumb.home': 'Inicio',

  'ad.label': 'Publicidad',

  'side.tocTitle': 'En esta página',
  'side.moreIn': 'Más en {category}',

  'article.summaryTitle': 'En resumen',
  'article.relatedTitle': 'También le puede interesar',

  'notFound.title': 'No encontramos esta página',
  'notFound.body': 'Puede que la dirección haya cambiado o que la página ya no exista. Pruebe con una de estas opciones.',
  'notFound.home': 'Volver al inicio',

  'source.title': 'Fuentes',
  'source.contact': 'Contacto',

  'news.storyLabel': 'Noticia {index}',
  'news.sourceLink': 'Leer el artículo original ({name})',

  'home.todayRecommend': 'Selección del día, {m}/{d}',
  'home.todayDate': 'Hoy · {y}.{m}.{d}',
  'home.featureExpand': 'Ver el contenido completo',
  'home.featureCollapse': 'Mostrar menos',

  'app.promoTitle': 'Organice sus medicamentos con la aplicación',
  'app.promoBody':
    'ParkinON le recuerda cuándo tomar sus medicamentos y guarda el historial. Su familia también puede acompañar cómo le va.',
  'app.shotAlt': 'La aplicación ParkinON mostrando el estado de los medicamentos de hoy',

  'app.effectTracking.title': 'Registre también cómo se siente en la aplicación',
  'app.effectTracking.body':
    'Anotar cómo está su cuerpo y su ánimo después de cada toma, junto con el horario de sus medicamentos, arma un historial que ayuda a seguir cómo le está funcionando el tratamiento.',
  'app.effectTracking.alt': 'Aplicación ParkinON - pantalla de registro del cuerpo y el ánimo',
  'app.exercise.title': 'Anote el ejercicio del día en la aplicación',
  'app.exercise.body':
    'Llevar un registro del ejercicio ayuda a mantener la constancia, y también permite que su acompañante vea cuánto se está moviendo.',
  'app.exercise.alt': 'Aplicación ParkinON - pantalla del registro de ejercicio',
  'app.record.title': 'Anote también sus síntomas en la aplicación',
  'app.record.body':
    'Llevar un registro de los síntomas del día a día facilita mucho describir los cambios en la próxima consulta.',
  'app.record.alt': 'Aplicación ParkinON - pantalla de registro y seguimiento',
  'app.medRegistration.title': 'Registre sus medicamentos en la aplicación',
  'app.medRegistration.body':
    'Al registrar qué toma y a qué hora, lo ve todo de un vistazo en lugar de llevar una lista aparte.',
  'app.medRegistration.alt': 'Aplicación ParkinON - pantalla de registro de medicamentos',
  'app.family.title': 'Llévenlo en familia',
  'app.family.body':
    'Cuando uno de ustedes anota algo, el otro también recibe aviso — para saber cómo está el otro incluso a distancia.',
  'app.family.alt': 'Aplicación ParkinON - pantalla de vinculación familiar',
  'app.reminder.title': 'Deje que la aplicación le recuerde tomar sus medicamentos',
  'app.reminder.body':
    'Reciba un aviso a la hora que usted elija, y al marcar la toma su historial se completa solo.',
  'app.reminder.alt': 'Aplicación ParkinON - pantalla de horario y recordatorio de medicamentos',
  'app.familyDiary.title': 'Compartan el día en familia',
  'app.familyDiary.body':
    'Escriba una nota breve cada día que después se puede reunir en un cuaderno, y la familia también puede participar.',
  'app.familyDiary.alt': 'Aplicación ParkinON - pantalla del diario familiar',
  'app.community.title': 'Converse con quienes están en una situación parecida',
  'app.community.body':
    'En la comunidad de información y encuentro de ParkinON, las personas con enfermedad de Parkinson y quienes las acompañan comparten sus experiencias.',
  'app.community.alt': 'Aplicación ParkinON - pantalla de la comunidad de información y encuentro',

  'medSchedule.deleteMed': 'Eliminar {name}',

  'footer.quickLinks': 'Enlaces rápidos',
  'footer.support': 'Atención',
  'footer.language': 'Idioma',
  'footer.privacyWeb': 'Aviso de privacidad',
  'footer.termsApp': 'Términos de uso de la aplicación',
  'footer.privacyApp': 'Aviso de privacidad de la aplicación',
  'footer.contact': 'Contáctenos',
  'footer.disclaimerLine1': 'La información de este sitio no sustituye el consejo médico.',
  'footer.disclaimerLine2': 'Consulte siempre a su médico antes de tomar cualquier decisión sobre su salud.',
  'footer.bizInfo': 'Datos de la empresa',
  'footer.bizCeo': 'Representantes',
  'footer.bizNumber': 'N.º de registro de empresa',
  'footer.bizMailOrder': 'N.º de venta a distancia',
  'footer.bizAddress': 'Dirección',
  'footer.bizPhone': 'Teléfono',
  'footer.bizEmail': 'Correo electrónico',
  'footer.bizWebsite': 'Sitio web',

  'lang.self': 'Español',
};

export default es;
