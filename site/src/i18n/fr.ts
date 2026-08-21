import type { Dict } from './en';

/*
 * Dictionnaire français (ciblant les francophones du Canada).
 * Les clés doivent correspondre exactement à celles de en.ts — voir ce fichier
 * pour les règles (aucun nom d'institution, statistique ou fait propre à un pays ici).
 */
const fr: Dict = {
  'brand.name': 'ParkinON',
  'site.description': 'ParkinON — pour rendre chaque jour avec la maladie de Parkinson un peu plus facile',

  'nav.news': 'Actualités',
  'nav.lifestyle': 'Vie quotidienne',
  'nav.clinical': 'Essais cliniques et recherche',
  'nav.exercise': 'Vidéos d’exercices',
  'exercise.tagline': 'Un peu de mouvement chaque jour peut vous faire sentir plus léger — allez-y à votre rythme.',

  'nav.institutions': 'Aides et soutien',
  'nav.tools': 'Outils',

  'country.all': 'Tous',
  'country.kr': 'Corée du Sud',
  'country.us': 'États-Unis',
  'country.jp': 'Japon',
  'country.fr': 'France',
  'country.de': 'Allemagne',
  'country.it': 'Italie',
  'country.au': 'Australie',
  'country.ca': 'Canada',
  'country.nz': 'Nouvelle-Zélande',
  'phase.EARLY_PHASE1': 'Phase précoce 1',
  'phase.PHASE1': 'Phase 1',
  'phase.PHASE2': 'Phase 2',
  'phase.PHASE3': 'Phase 3',
  'phase.PHASE4': 'Phase 4',
  'phase.NA': 'Non applicable',

  'clinical.tagline': 'Consultez les essais cliniques sur la maladie de Parkinson actuellement en recrutement, par pays — ainsi que la recherche connexe.',
  'clinical.englishNotice': 'Voici les essais cliniques sur la maladie de Parkinson actuellement en cours, à titre de référence. Si l’un d’eux vous semble pertinent, parlez-en à votre médecin ou à votre infirmière.',
  'clinical.phase': 'Phase',
  'clinical.location': 'Lieu',
  'clinical.moreLocations': '+{n} autres lieux',

  'phaseDesc.EARLY_PHASE1': 'Une étape exploratoire avant la phase 1 standard, qui vérifie le comportement d’un médicament dans l’organisme avec très peu de participants. Elle n’a aucun objectif thérapeutique ni diagnostique.',
  'phaseDesc.PHASE1': 'Se concentre sur l’innocuité d’un médicament. Généralement menée auprès de volontaires en bonne santé, avec un petit nombre de participants.',
  'phaseDesc.PHASE2': 'Recueille des premières données sur l’efficacité d’un médicament, tout en continuant à surveiller son innocuité.',
  'phaseDesc.PHASE3': 'Recueille davantage de données sur l’innocuité et l’efficacité auprès de différents groupes et dosages, avec un plus grand nombre de participants.',
  'phaseDesc.PHASE4': 'Se déroule après l’approbation d’un médicament, afin de recueillir des informations supplémentaires sur son innocuité, son efficacité ou sa meilleure utilisation.',
  'phaseDesc.NA': 'Un essai sans phase de développement pharmaceutique (par exemple, une étude portant sur un dispositif ou un comportement).',
  'clinical.phaseHelp': 'Que signifie cette phase ?',
  'clinical.phaseMore': 'En savoir plus',
  'term.readMore': 'En savoir plus',
  'clinical.duration': 'Durée',
  'clinical.estimated': 'estimée',
  'clinical.recruiting': 'En recrutement',
  'clinical.closed': 'Recrutement terminé',
  'clinical.sponsor': 'Promoteur',
  'clinical.contact': 'Contact',
  'clinical.viewOriginal': 'Voir sur ClinicalTrials.gov',
  'clinical.noTrials': 'Aucun essai en recrutement trouvé pour ce pays actuellement.',
  'clinical.overflowNote': 'Affichage des {shown} essais les plus récemment mis à jour sur {total}.',
  'clinical.seeAll': 'Voir tout sur ClinicalTrials.gov',
  'clinical.disclaimer': 'Cette liste est fournie à titre informatif seulement. Si vous souhaitez participer à un essai, parlez-en d’abord à votre médecin et contactez directement l’équipe de l’étude.',
  'clinical.feedTrials': 'Essais',

  'research.feedLabel': 'Recherche',
  'research.heading': 'Recherche connexe',
  'research.tagline': 'Une sélection des principales recherches sur la maladie de Parkinson. Critères de sélection : essais de phase III ou plus, méta-analyses, ou grandes revues médicales (Lancet Neurology, Brain, Movement Disorders, JAMA Neurology, Neurology).',
  'research.journal': 'Revue',
  'research.published': 'Publié',
  'research.readAbstract': 'Voir le résumé sur PubMed',
  'research.readFullText': 'Lire le texte intégral',
  'research.paidNotice': 'Le texte intégral est payant (accessible après achat). Le texte ci-dessus est le résumé complet tel que publié par les auteurs.',
  'research.translationPending': 'La traduction de cet article n’est pas encore prête. Le résumé original (en anglais) est disponible sur PubMed.',
  'research.disclaimer': 'N’appliquez pas ces résultats directement à vos soins ou décisions de traitement. Parlez-en à votre médecin pour toute question.',
  'research.noPapers': 'Aucune nouvelle recherche ne correspond actuellement aux critères.',
  'research.overflowNote': 'Affichage des {shown} plus récents sur {total} au total.',
  'research.seeAll': 'Voir tout sur PubMed',
  'research.pubtype.metaAnalysis': 'Méta-analyse',
  'research.pubtype.phase3': 'Essai de phase III',
  'research.pubtype.phase4': 'Essai de phase IV',
  'research.pubtype.rct': 'Essai contrôlé randomisé',
  'research.pubtype.systematicReview': 'Revue systématique',
  'research.pubtype.observational': 'Étude observationnelle',

  'search.placeholder': 'Rechercher par titre',
  'search.submit': 'Rechercher',
  'search.clear': 'Effacer',
  'search.sectionArticles': 'Articles',
  'search.loadMore': 'Voir plus',
  'search.noResults': 'Aucun résultat trouvé.',
  'search.resultCount': '{n} résultats',
  'search.resultCountForQuery': '{n} résultats pour « {q} »',
  'search.filter.anyPhase': 'Toutes les phases',
  'search.filter.anyStatus': 'Tous les statuts',
  'search.filter.statusRecruiting': 'En recrutement',
  'search.filter.statusClosed': 'Recrutement terminé',
  'search.filter.startDate': 'Période',
  'search.filter.dateYearAny': 'Année',
  'search.filter.dateMonthAny': 'Mois',
  'search.filter.dateYearUnit': '{n}',
  'search.filter.dateMonthUnit': '{n}',
  'search.filter.sponsor': 'Promoteur',
  'search.filter.anyPubtype': 'Tout type d’étude',
  'search.filter.anyJournal': 'Toute revue',
  'search.filter.year': 'Année de publication',

  'date.yearMonth': '{m} {y}',
  'date.yearOnly': '{y}',

  'category.news': 'Actualités',
  'category.lifestyle': 'Vie quotidienne',
  'category.institutions': 'Aides et soutien',

  'header.search': 'Rechercher',
  'header.menu': 'Menu',
  'header.searchPlaceholder': 'Recherchez ce dont vous avez besoin',

  'breadcrumb.home': 'Accueil',

  'ad.label': 'Publicité',

  'side.tocTitle': 'Sur cette page',
  'side.moreIn': 'Plus dans {category}',

  'article.summaryTitle': 'En résumé',
  'article.relatedTitle': 'À lire aussi',

  'notFound.title': 'Nous n’avons pas trouvé cette page',
  'notFound.body': 'L’adresse a peut-être changé, ou la page n’existe plus. Essayez plutôt l’une de ces options.',
  'notFound.home': 'Retourner à l’accueil',

  'source.title': 'Sources',
  'source.contact': 'Contact',

  'news.storyLabel': 'Actualité {index}',
  'news.sourceLink': 'Lire l’article original ({name})',

  'home.todayRecommend': 'Sélection du jour, {m}/{d}',
  'home.todayDate': 'Aujourd’hui · {y}.{m}.{d}',
  'home.featureExpand': 'Voir le contenu complet',
  'home.featureCollapse': 'Réduire',

  'app.promoTitle': 'Gérez vos médicaments avec l’appli',
  'app.promoBody':
    'ParkinON vous rappelle quand prendre vos médicaments et en conserve l’historique. Votre famille peut aussi suivre votre progression.',
  'app.shotAlt': 'L’appli ParkinON affichant l’état des médicaments du jour',

  'app.effectTracking.title': 'Suivez aussi comment vous vous sentez dans l’appli',
  'app.effectTracking.body':
    'Noter votre état physique et votre humeur après chaque prise, en lien avec votre horaire de médicaments, crée un historique qui vous aide à suivre l’efficacité de votre traitement.',
  'app.effectTracking.alt': 'Appli ParkinON - écran de suivi du corps et de l’humeur',
  'app.exercise.title': 'Notez vos exercices du jour dans l’appli',
  'app.exercise.body':
    'Tenir un journal d’exercices vous motive à continuer, et permet aussi à votre proche aidant de voir votre niveau d’activité.',
  'app.exercise.alt': 'Appli ParkinON - écran du journal d’exercices',
  'app.record.title': 'Notez aussi vos symptômes dans l’appli',
  'app.record.body':
    'Tenir un registre de vos symptômes au quotidien facilite grandement la description des changements lors de votre prochain rendez-vous.',
  'app.record.alt': 'Appli ParkinON - écran de suivi et de gestion',
  'app.medRegistration.title': 'Enregistrez vos médicaments dans l’appli',
  'app.medRegistration.body':
    'En enregistrant ce que vous prenez et à quel moment, vous voyez tout en un coup d’œil au lieu de tenir une liste séparée.',
  'app.medRegistration.alt': 'Appli ParkinON - écran d’enregistrement des médicaments',
  'app.family.title': 'Gérez la situation en famille',
  'app.family.body':
    'Quand l’un de vous ajoute une entrée, l’autre en est aussi averti — pour prendre des nouvelles l’un de l’autre même à distance.',
  'app.family.alt': 'Appli ParkinON - écran de liaison familiale',
  'app.reminder.title': 'Laissez l’appli vous rappeler de prendre vos médicaments',
  'app.reminder.body':
    'Recevez une notification à l’heure que vous avez choisie, et cocher la prise alimente automatiquement votre historique.',
  'app.reminder.alt': 'Appli ParkinON - écran d’horaire et de rappel de médicaments',
  'app.familyDiary.title': 'Partagez votre journée en famille',
  'app.familyDiary.body':
    'Tenez une courte entrée quotidienne qui pourra plus tard être rassemblée dans un carnet, avec la possibilité pour la famille d’y participer aussi.',
  'app.familyDiary.alt': 'Appli ParkinON - écran de journal familial',
  'app.community.title': 'Échangez avec d’autres personnes dans une situation semblable',
  'app.community.body':
    'Dans la communauté d’information et de partage de l’appli ParkinON, les personnes atteintes de la maladie de Parkinson et leurs proches aidants peuvent partager leurs expériences.',
  'app.community.alt': 'Appli ParkinON - écran de la communauté d’information et de partage',

  'medSchedule.deleteMed': 'Supprimer {name}',

  'footer.quickLinks': 'Liens rapides',
  'footer.support': 'Assistance',
  'footer.privacyWeb': 'Politique de confidentialité',
  'footer.termsApp': 'Conditions d’utilisation de l’appli',
  'footer.privacyApp': 'Politique de confidentialité de l’appli',
  'footer.contact': 'Nous contacter',
  'footer.disclaimerLine1': 'Les informations de ce site ne remplacent pas un avis médical.',
  'footer.disclaimerLine2': 'Consultez toujours votre médecin avant toute décision médicale.',
  'footer.bizInfo': 'Informations sur l’entreprise',
  'footer.bizCeo': 'Représentants',
  'footer.bizNumber': 'N° d’enregistrement d’entreprise',
  'footer.bizMailOrder': 'N° de vente par correspondance',
  'footer.bizAddress': 'Adresse',
  'footer.bizPhone': 'Téléphone',
  'footer.bizEmail': 'Courriel',
  'footer.bizWebsite': 'Site Web',

  'lang.self': 'Français',
};

export default fr;
