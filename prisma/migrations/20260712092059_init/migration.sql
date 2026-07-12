-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'COMMERCIAL', 'FORMATEUR');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('GOOGLE_OAUTH', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('SIGN_DOCUMENT', 'COMPLETE_EVALUATION', 'DOWNLOAD_ATTESTATION', 'CONFIRM_INSCRIPTION', 'AUDITOR_READONLY');

-- CreateEnum
CREATE TYPE "NafVersion" AS ENUM ('REV2', 'V2025');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PROSPECT', 'ACTIF', 'EN_PAUSE');

-- CreateEnum
CREATE TYPE "ClientOrigin" AS ENUM ('DIRECT', 'APPEL_OFFRE', 'RESEAU', 'INBOUND_SITE');

-- CreateEnum
CREATE TYPE "NafSource" AS ENUM ('MANUAL', 'SIRENE');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('PRINCIPAL', 'ADMINISTRATIF', 'SIGNATAIRE');

-- CreateEnum
CREATE TYPE "Civilite" AS ENUM ('MADAME', 'MONSIEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "BrandProgramme" AS ENUM ('BAM', 'POP', 'CLIC', 'WOW');

-- CreateEnum
CREATE TYPE "FormationFormat" AS ENUM ('PRESENTIEL', 'DISTANCIEL', 'ELEARNING', 'PRESENTIEL_DISTANCIEL', 'PRESENTIEL_ELEARNING', 'DISTANCIEL_ELEARNING', 'MIXTE_COMPLET');

-- CreateEnum
CREATE TYPE "PrestationCode" AS ENUM ('DIPLOME', 'CERTIFICATION', 'CQP_NON_ENREGISTRE', 'AUTRE_ACTION_FORMATION', 'BILAN_COMPETENCES', 'VAE');

-- CreateEnum
CREATE TYPE "FormateurContractType" AS ENUM ('INTERNE_DIRIGEANT', 'INTERNE_SALARIE', 'EXTERNE_PRESTATAIRE');

-- CreateEnum
CREATE TYPE "CompetenceType" AS ENUM ('CV', 'DIPLOME', 'CERTIFICATION', 'FORMATION_CONTINUE', 'SUPERVISION');

-- CreateEnum
CREATE TYPE "DemandeStatus" AS ENUM ('NOUVELLE', 'ANALYSE', 'PROPOSITION_ENVOYEE', 'GAGNEE', 'PERDUE');

-- CreateEnum
CREATE TYPE "DemandeSource" AS ENUM ('APPEL_DECOUVERTE', 'APPEL_OFFRE', 'RESEAU', 'INBOUND_SITE');

-- CreateEnum
CREATE TYPE "PandoRole" AS ENUM ('PRESTATAIRE_DIRECT', 'SOUS_TRAITANT');

-- CreateEnum
CREATE TYPE "Track" AS ENUM ('INTRA', 'INTER');

-- CreateEnum
CREATE TYPE "ParcoursStatus" AS ENUM ('BROUILLON', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "PriceMode" AS ENUM ('FORFAIT_JOUR', 'PAR_PERSONNE', 'NEGOCIE');

-- CreateEnum
CREATE TYPE "SequenceType" AS ENUM ('PRESENTIEL', 'DISTANCIEL', 'ELEARNING', 'COACHING', 'TRAVAIL_AUTONOME', 'DEFI');

-- CreateEnum
CREATE TYPE "PreuveType" AS ENUM ('SIGNATURE', 'CONNEXION', 'COMPLETION', 'COMPTE_RENDU', 'PAPER');

-- CreateEnum
CREATE TYPE "DemiJournee" AS ENUM ('MATIN', 'APRES_MIDI');

-- CreateEnum
CREATE TYPE "Confidentiality" AS ENUM ('PUBLIC', 'INTERNE', 'RESTREINT', 'CONFIDENTIEL');

-- CreateEnum
CREATE TYPE "LivrableType" AS ENUM ('REGLES_DU_JEU', 'REFERENTIEL_DECISIONNEL', 'ENGAGEMENTS_COLLECTIFS', 'AUTRE');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('ORGANISATION', 'INDIVIDU', 'OPCO', 'DONNEUR_ORDRE');

-- CreateEnum
CREATE TYPE "ContractualisationStatus" AS ENUM ('BROUILLON', 'DEVIS_ENVOYE', 'DEVIS_SIGNE', 'CONVENTION_ENVOYEE', 'CONVENTION_SIGNEE', 'FACTUREE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "Situation" AS ENUM ('SALARIE', 'PARTICULIER', 'INDEPENDANT');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('INSCRIT', 'CONVOQUE', 'EN_COURS', 'TERMINE', 'ABANDON', 'ABSENT', 'ANNULE');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT_JUSTIFIE', 'ABSENT_NON_JUSTIFIE', 'ABANDON');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('POSITIONNEMENT', 'SATISFACTION_MI_PARCOURS', 'ACQUIS', 'EVALUATION_FORMATION', 'QUESTIONNAIRE_COMMANDITAIRE', 'QUESTIONNAIRE_FORMATEUR', 'QUESTIONNAIRE_FINANCEUR', 'FROID_3M', 'FROID_6M', 'FROID_12M');

-- CreateEnum
CREATE TYPE "EvaluationScope" AS ENUM ('INDIVIDUEL', 'COLLECTIF');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPOSITION', 'DEVIS', 'BON_DE_COMMANDE', 'CONVENTION_DE_FORMATION', 'CONTRAT_DE_FORMATION_PRO', 'ANNEXE_CONVENTION', 'AVENANT_CONVENTION', 'CONVENTION_SOUS_TRAITANCE', 'PROGRAMME', 'CONVOCATION', 'FEUILLE_EMARGEMENT', 'ATTESTATION_FORMATION', 'CERTIFICAT_REALISATION', 'FACTURE', 'AVOIR', 'SUPPORT_FORMATION', 'ANALYSE_BESOIN', 'CV_FORMATEUR', 'DIPLOME_FORMATEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SENT', 'SIGNED', 'EXPIRED', 'REFUSED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('ANALYSE_BESOIN', 'DEVIS_SEND', 'DEVIS_ALERT_UNSIGNED', 'LISTE_PARTICIPANTS_ALERT', 'CONVENTION_SEND', 'CONVENTION_ALERT_UNSIGNED', 'CONVENTION_ST_SEND', 'FACTURE_SEND', 'PROGRAMME_SEND', 'CONVOCATION_SEND', 'POSITIONNEMENT_SEND', 'EMARGEMENT_READY', 'SATISFACTION_MI_SEND', 'ACQUIS_SEND', 'EVAL_FORMATION_SEND', 'ATTESTATION_SEND', 'CERTIFICAT_REALISATION', 'SUPPORTS_SEND', 'QUESTIONNAIRE_COMMANDITAIRE', 'QUESTIONNAIRE_FORMATEUR', 'QUESTIONNAIRE_FINANCEUR', 'EVAL_FROID_3M', 'EVAL_FROID_6M', 'EVAL_FROID_12M', 'INTER_MINIMUM_ALERT', 'COMPETENCE_EXPIRY_ALERT');

-- CreateEnum
CREATE TYPE "AnchorType" AS ENUM ('PARCOURS_START', 'PARCOURS_END', 'SEQUENCE_DATE', 'CONTRACT_EVENT', 'FIXED_DATE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'SOFT_BOUNCE', 'HARD_BOUNCE', 'BLOCKED', 'SPAM', 'OPENED');

-- CreateEnum
CREATE TYPE "FinancementType" AS ENUM ('ENTREPRISE_DIRECTE', 'OPCO', 'CPF', 'FONDS_PROPRES', 'AUTRE');

-- CreateEnum
CREATE TYPE "ReclamationSource" AS ENUM ('PARTICIPANT', 'CLIENT', 'FORMATEUR', 'FINANCEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "ActionOrigin" AS ENUM ('RECLAMATION', 'EVALUATION', 'AUDIT', 'VEILLE', 'INTERNE');

-- CreateEnum
CREATE TYPE "VeilleType" AS ENUM ('LEGALE', 'METIER', 'PEDAGOGIQUE', 'HANDICAP', 'INNOVATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "roles" "Role"[],
    "authMethod" "AuthMethod" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "formateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdIp" TEXT,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "email" TEXT NOT NULL,
    "parcoursId" TEXT,
    "documentId" TEXT,
    "evaluationId" TEXT,
    "auditScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'PANDO',
    "legalName" TEXT,
    "siret" TEXT NOT NULL,
    "nda" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "vatExempt" BOOLEAN NOT NULL DEFAULT true,
    "vatExemptCode" TEXT NOT NULL DEFAULT 'art. 261-4-4° a CGI',

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NsfGrandDomaine" (
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,

    CONSTRAINT "NsfGrandDomaine_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NsfDomaine" (
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "grandDomaineCode" TEXT NOT NULL,

    CONSTRAINT "NsfDomaine_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NsfGroupe" (
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "domaineCode" TEXT NOT NULL,

    CONSTRAINT "NsfGroupe_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NsfChamps" (
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,

    CONSTRAINT "NsfChamps_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NsfSpecialite" (
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "groupeCode" TEXT NOT NULL,
    "champsCode" TEXT NOT NULL,

    CONSTRAINT "NsfSpecialite_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "NafCode" (
    "code" TEXT NOT NULL,
    "version" "NafVersion" NOT NULL,
    "libelle" TEXT NOT NULL,
    "section" TEXT,

    CONSTRAINT "NafCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "siret" TEXT,
    "siren" TEXT,
    "isPublicSector" BOOLEAN NOT NULL DEFAULT false,
    "categorieJuridique" TEXT,
    "nafRev2" TEXT,
    "naf2025" TEXT,
    "nafSource" "NafSource" NOT NULL DEFAULT 'MANUAL',
    "secteur" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "region" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'PROSPECT',
    "origin" "ClientOrigin" NOT NULL DEFAULT 'DIRECT',
    "assignedToId" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "roles" "ContactRole"[],
    "civilite" "Civilite",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fonction" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "brandProgramme" "BrandProgramme",
    "requiresFullCohort" BOOLEAN NOT NULL DEFAULT false,
    "intraOnly" BOOLEAN NOT NULL DEFAULT false,
    "durationHours" DECIMAL(6,2) NOT NULL,
    "durationDays" DECIMAL(5,2) NOT NULL,
    "format" "FormationFormat" NOT NULL,
    "prerequisites" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "pedagogicObjectives" TEXT[],
    "methodesPedagogiques" TEXT,
    "modalitesEvaluation" TEXT,
    "delaiAcces" TEXT NOT NULL,
    "accessibilite" TEXT NOT NULL,
    "priceIntraPerDay" INTEGER,
    "priceInterPerPerson" INTEGER,
    "bpfIncluded" BOOLEAN NOT NULL DEFAULT true,
    "prestationCode" "PrestationCode",
    "specialiteId" TEXT,
    "tauxSatisfaction" DECIMAL(5,2),
    "tauxReussite" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationVersion" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formateur" (
    "id" TEXT NOT NULL,
    "civilite" "Civilite",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "contractType" "FormateurContractType" NOT NULL,
    "siren" TEXT,
    "nda" TEXT,
    "tvaRate" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "tarifJour" INTEGER,
    "forfaitDeplacement" INTEGER NOT NULL DEFAULT 0,
    "isQualiopiCertified" BOOLEAN NOT NULL DEFAULT false,
    "expertises" TEXT[],
    "yearsFormation" INTEGER,
    "yearsManagement" INTEGER,
    "availabilityNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Formateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormateurCompetence" (
    "id" TEXT NOT NULL,
    "formateurId" TEXT NOT NULL,
    "type" "CompetenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormateurCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demande" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" "DemandeSource" NOT NULL,
    "status" "DemandeStatus" NOT NULL DEFAULT 'NOUVELLE',
    "ownerId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyseBesoin" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "contexteOrganisation" TEXT NOT NULL,
    "problematique" TEXT NOT NULL,
    "objectifsClient" TEXT[],
    "profilsCibles" TEXT NOT NULL,
    "contraintes" TEXT NOT NULL,
    "indicateursSucces" TEXT[],
    "adaptationsProposees" TEXT NOT NULL,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNE',
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyseBesoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcours" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "formationVersionId" TEXT NOT NULL,
    "demandeId" TEXT,
    "pandoRole" "PandoRole" NOT NULL DEFAULT 'PRESTATAIRE_DIRECT',
    "track" "Track" NOT NULL,
    "status" "ParcoursStatus" NOT NULL DEFAULT 'BROUILLON',
    "clientId" TEXT,
    "beneficiaireId" TEXT,
    "donneurOrdreId" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "totalHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "minParticipants" INTEGER,
    "maxParticipants" INTEGER,
    "montantHT" INTEGER NOT NULL DEFAULT 0,
    "delaiReglement" INTEGER NOT NULL DEFAULT 30,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Parcours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "SequenceType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "demiJournees" "DemiJournee"[],
    "heures" DECIMAL(5,2) NOT NULL,
    "lieu" TEXT,
    "preuveType" "PreuveType" NOT NULL,
    "formateurId" TEXT,
    "rescheduledFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceLivrable" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "type" "LivrableType" NOT NULL,
    "content" JSONB NOT NULL,
    "validatedBy" TEXT[],
    "validatedAt" TIMESTAMP(3),
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'RESTREINT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceLivrable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractualisation" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "payerType" "PayerType" NOT NULL,
    "payerClientId" TEXT,
    "payerParticipantId" TEXT,
    "financeurId" TEXT,
    "signataireId" TEXT,
    "status" "ContractualisationStatus" NOT NULL DEFAULT 'BROUILLON',
    "priceMode" "PriceMode" NOT NULL DEFAULT 'FORFAIT_JOUR',
    "montantHT" INTEGER NOT NULL DEFAULT 0,
    "remise" INTEGER NOT NULL DEFAULT 0,
    "delaiReglement" INTEGER,
    "numeroEngagement" TEXT,
    "codeService" TEXT,
    "chorusProSentAt" TIMESTAMP(3),
    "retractationEndsAt" TIMESTAMP(3),
    "qontoQuoteId" TEXT,
    "qontoInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractualisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "civilite" "Civilite",
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "fonction" TEXT,
    "situation" "Situation" NOT NULL,
    "clientId" TEXT,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcoursParticipant" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "contractualisationId" TEXT,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'INSCRIT',
    "abandonReason" TEXT,
    "convocationStatus" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "positionnementStatus" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "acquisStatus" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "attestationIssuedAt" TIMESTAMP(3),
    "hoursAttended" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "besoinAccessibilite" TEXT,
    "adaptationProposee" TEXT,
    "adaptationTraceeAt" TIMESTAMP(3),
    "referentHandicapId" TEXT,
    "paymentStatus" TEXT,
    "paidAt" TIMESTAMP(3),
    "carnetIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcoursParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "demiJournee" "DemiJournee" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "preuveType" "PreuveType" NOT NULL,
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "formateurSignedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "justification" TEXT,
    "documentId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "scope" "EvaluationScope" NOT NULL DEFAULT 'INDIVIDUEL',
    "participantId" TEXT,
    "formateurId" TEXT,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "responses" JSONB,
    "score" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "legalMentions" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "parcoursId" TEXT,
    "sequenceId" TEXT,
    "contractualisationId" TEXT,
    "templateVersionId" TEXT,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "yousignRequestId" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureAttempts" INTEGER NOT NULL DEFAULT 0,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formationId" TEXT,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "trigger" "TriggerType" NOT NULL,
    "anchor" "AnchorType" NOT NULL,
    "offsetDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "executedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "cloudTaskName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationSequence" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT,
    "jobId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "brevoMessageId" TEXT,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financeur" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "type" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Financeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financement" (
    "id" TEXT NOT NULL,
    "contractualisationId" TEXT NOT NULL,
    "type" "FinancementType" NOT NULL,
    "financeurId" TEXT,
    "dossierNumber" TEXT,
    "montantPrisEnCharge" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referentiel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referentiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Critere" (
    "id" TEXT NOT NULL,
    "referentielId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,

    CONSTRAINT "Critere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicateur" (
    "id" TEXT NOT NULL,
    "critereId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "applicable" BOOLEAN NOT NULL DEFAULT true,
    "expectedProof" TEXT,

    CONSTRAINT "Indicateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceLink" (
    "id" TEXT NOT NULL,
    "indicateurId" TEXT NOT NULL,
    "parcoursId" TEXT,
    "documentId" TEXT,
    "attendanceId" TEXT,
    "evaluationId" TEXT,
    "analyseBesoinId" TEXT,
    "livrableId" TEXT,
    "reclamationId" TEXT,
    "actionId" TEXT,
    "veilleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reclamation" (
    "id" TEXT NOT NULL,
    "source" "ReclamationSource" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedVia" TEXT,
    "description" TEXT NOT NULL,
    "qualification" TEXT,
    "responseAt" TIMESTAMP(3),
    "responseText" TEXT,
    "actionId" TEXT,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNE',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionAmelioration" (
    "id" TEXT NOT NULL,
    "origin" "ActionOrigin" NOT NULL,
    "description" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionAmelioration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veille" (
    "id" TEXT NOT NULL,
    "type" "VeilleType" NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "soWhat" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Veille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarnetEntry" (
    "id" TEXT NOT NULL,
    "parcoursParticipantId" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "prompt" TEXT,
    "content" TEXT NOT NULL,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'RESTREINT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarnetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAction" (
    "id" TEXT NOT NULL,
    "parcoursParticipantId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "selfAssessment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanActionEngagement" (
    "id" TEXT NOT NULL,
    "planActionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "achieved" BOOLEAN,
    "evidence" TEXT,

    CONSTRAINT "PlanActionEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefiSubmission" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "parcoursParticipantId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "content" TEXT,
    "formateurFeedback" TEXT,
    "feedbackAt" TIMESTAMP(3),

    CONSTRAINT "DefiSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteRendu" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'CONFIDENTIEL',
    "coachConfirmedAt" TIMESTAMP(3),
    "beneficiaryConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompteRendu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_formateurId_key" ON "User"("formateurId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionToken_key" ON "AuthSession"("sessionToken");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- CreateIndex
CREATE INDEX "MagicLinkToken_token_idx" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_token_key" ON "AccessToken"("token");

-- CreateIndex
CREATE INDEX "AccessToken_token_idx" ON "AccessToken"("token");

-- CreateIndex
CREATE INDEX "NsfSpecialite_groupeCode_idx" ON "NsfSpecialite"("groupeCode");

-- CreateIndex
CREATE INDEX "NafCode_version_idx" ON "NafCode"("version");

-- CreateIndex
CREATE UNIQUE INDEX "Client_siret_key" ON "Client"("siret");

-- CreateIndex
CREATE INDEX "Client_siret_idx" ON "Client"("siret");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_internalCode_key" ON "Formation"("internalCode");

-- CreateIndex
CREATE INDEX "Formation_brandProgramme_idx" ON "Formation"("brandProgramme");

-- CreateIndex
CREATE UNIQUE INDEX "FormationVersion_formationId_version_key" ON "FormationVersion"("formationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Formateur_email_key" ON "Formateur"("email");

-- CreateIndex
CREATE INDEX "Formateur_email_idx" ON "Formateur"("email");

-- CreateIndex
CREATE INDEX "Formateur_contractType_idx" ON "Formateur"("contractType");

-- CreateIndex
CREATE INDEX "FormateurCompetence_formateurId_idx" ON "FormateurCompetence"("formateurId");

-- CreateIndex
CREATE INDEX "FormateurCompetence_expiresAt_idx" ON "FormateurCompetence"("expiresAt");

-- CreateIndex
CREATE INDEX "Demande_clientId_idx" ON "Demande"("clientId");

-- CreateIndex
CREATE INDEX "Demande_status_idx" ON "Demande"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyseBesoin_demandeId_key" ON "AnalyseBesoin"("demandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Parcours_reference_key" ON "Parcours"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Parcours_demandeId_key" ON "Parcours"("demandeId");

-- CreateIndex
CREATE INDEX "Parcours_status_idx" ON "Parcours"("status");

-- CreateIndex
CREATE INDEX "Parcours_dateDebut_idx" ON "Parcours"("dateDebut");

-- CreateIndex
CREATE INDEX "Parcours_clientId_idx" ON "Parcours"("clientId");

-- CreateIndex
CREATE INDEX "Sequence_date_idx" ON "Sequence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_parcoursId_ordre_key" ON "Sequence"("parcoursId", "ordre");

-- CreateIndex
CREATE INDEX "SequenceLivrable_sequenceId_idx" ON "SequenceLivrable"("sequenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractualisation_qontoQuoteId_key" ON "Contractualisation"("qontoQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractualisation_qontoInvoiceId_key" ON "Contractualisation"("qontoInvoiceId");

-- CreateIndex
CREATE INDEX "Contractualisation_parcoursId_idx" ON "Contractualisation"("parcoursId");

-- CreateIndex
CREATE INDEX "Contractualisation_status_idx" ON "Contractualisation"("status");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE INDEX "ParcoursParticipant_status_idx" ON "ParcoursParticipant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ParcoursParticipant_parcoursId_participantId_key" ON "ParcoursParticipant"("parcoursId", "participantId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sequenceId_participantId_demiJournee_key" ON "Attendance"("sequenceId", "participantId", "demiJournee");

-- CreateIndex
CREATE INDEX "Evaluation_parcoursId_idx" ON "Evaluation"("parcoursId");

-- CreateIndex
CREATE INDEX "Evaluation_scheduledFor_idx" ON "Evaluation"("scheduledFor");

-- CreateIndex
CREATE INDEX "Evaluation_type_idx" ON "Evaluation"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_type_version_key" ON "DocumentTemplate"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Document_yousignRequestId_key" ON "Document"("yousignRequestId");

-- CreateIndex
CREATE INDEX "Document_parcoursId_idx" ON "Document"("parcoursId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationJob_cloudTaskName_key" ON "AutomationJob"("cloudTaskName");

-- CreateIndex
CREATE INDEX "AutomationJob_scheduledFor_status_idx" ON "AutomationJob"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "AutomationJob_parcoursId_idx" ON "AutomationJob"("parcoursId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationMessage_brevoMessageId_key" ON "CommunicationMessage"("brevoMessageId");

-- CreateIndex
CREATE INDEX "CommunicationMessage_scheduledFor_deliveryStatus_idx" ON "CommunicationMessage"("scheduledFor", "deliveryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Financeur_siret_key" ON "Financeur"("siret");

-- CreateIndex
CREATE INDEX "Financement_contractualisationId_idx" ON "Financement"("contractualisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Critere_referentielId_numero_key" ON "Critere"("referentielId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Indicateur_critereId_numero_key" ON "Indicateur"("critereId", "numero");

-- CreateIndex
CREATE INDEX "EvidenceLink_indicateurId_idx" ON "EvidenceLink"("indicateurId");

-- CreateIndex
CREATE INDEX "EvidenceLink_parcoursId_idx" ON "EvidenceLink"("parcoursId");

-- CreateIndex
CREATE INDEX "ActionAmelioration_ownerId_idx" ON "ActionAmelioration"("ownerId");

-- CreateIndex
CREATE INDEX "ActionAmelioration_dueDate_idx" ON "ActionAmelioration"("dueDate");

-- CreateIndex
CREATE INDEX "Veille_type_idx" ON "Veille"("type");

-- CreateIndex
CREATE INDEX "Veille_date_idx" ON "Veille"("date");

-- CreateIndex
CREATE INDEX "CarnetEntry_parcoursParticipantId_idx" ON "CarnetEntry"("parcoursParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanAction_parcoursParticipantId_key" ON "PlanAction"("parcoursParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanActionEngagement_planActionId_ordre_key" ON "PlanActionEngagement"("planActionId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "DefiSubmission_sequenceId_parcoursParticipantId_key" ON "DefiSubmission"("sequenceId", "parcoursParticipantId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NsfDomaine" ADD CONSTRAINT "NsfDomaine_grandDomaineCode_fkey" FOREIGN KEY ("grandDomaineCode") REFERENCES "NsfGrandDomaine"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NsfGroupe" ADD CONSTRAINT "NsfGroupe_domaineCode_fkey" FOREIGN KEY ("domaineCode") REFERENCES "NsfDomaine"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NsfSpecialite" ADD CONSTRAINT "NsfSpecialite_groupeCode_fkey" FOREIGN KEY ("groupeCode") REFERENCES "NsfGroupe"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NsfSpecialite" ADD CONSTRAINT "NsfSpecialite_champsCode_fkey" FOREIGN KEY ("champsCode") REFERENCES "NsfChamps"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_specialiteId_fkey" FOREIGN KEY ("specialiteId") REFERENCES "NsfSpecialite"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationVersion" ADD CONSTRAINT "FormationVersion_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormateurCompetence" ADD CONSTRAINT "FormateurCompetence_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormateurCompetence" ADD CONSTRAINT "FormateurCompetence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyseBesoin" ADD CONSTRAINT "AnalyseBesoin_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyseBesoin" ADD CONSTRAINT "AnalyseBesoin_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_formationVersionId_fkey" FOREIGN KEY ("formationVersionId") REFERENCES "FormationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_beneficiaireId_fkey" FOREIGN KEY ("beneficiaireId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_donneurOrdreId_fkey" FOREIGN KEY ("donneurOrdreId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceLivrable" ADD CONSTRAINT "SequenceLivrable_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractualisation" ADD CONSTRAINT "Contractualisation_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractualisation" ADD CONSTRAINT "Contractualisation_payerClientId_fkey" FOREIGN KEY ("payerClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractualisation" ADD CONSTRAINT "Contractualisation_payerParticipantId_fkey" FOREIGN KEY ("payerParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractualisation" ADD CONSTRAINT "Contractualisation_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "Financeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractualisation" ADD CONSTRAINT "Contractualisation_signataireId_fkey" FOREIGN KEY ("signataireId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcoursParticipant" ADD CONSTRAINT "ParcoursParticipant_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcoursParticipant" ADD CONSTRAINT "ParcoursParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcoursParticipant" ADD CONSTRAINT "ParcoursParticipant_contractualisationId_fkey" FOREIGN KEY ("contractualisationId") REFERENCES "Contractualisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcoursParticipant" ADD CONSTRAINT "ParcoursParticipant_referentHandicapId_fkey" FOREIGN KEY ("referentHandicapId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contractualisationId_fkey" FOREIGN KEY ("contractualisationId") REFERENCES "Contractualisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationSequence" ADD CONSTRAINT "CommunicationSequence_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationSequence" ADD CONSTRAINT "CommunicationSequence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CommunicationSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AutomationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financement" ADD CONSTRAINT "Financement_contractualisationId_fkey" FOREIGN KEY ("contractualisationId") REFERENCES "Contractualisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financement" ADD CONSTRAINT "Financement_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "Financeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Critere" ADD CONSTRAINT "Critere_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicateur" ADD CONSTRAINT "Indicateur_critereId_fkey" FOREIGN KEY ("critereId") REFERENCES "Critere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_indicateurId_fkey" FOREIGN KEY ("indicateurId") REFERENCES "Indicateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_analyseBesoinId_fkey" FOREIGN KEY ("analyseBesoinId") REFERENCES "AnalyseBesoin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_livrableId_fkey" FOREIGN KEY ("livrableId") REFERENCES "SequenceLivrable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionAmelioration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_veilleId_fkey" FOREIGN KEY ("veilleId") REFERENCES "Veille"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionAmelioration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAmelioration" ADD CONSTRAINT "ActionAmelioration_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAmelioration" ADD CONSTRAINT "ActionAmelioration_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veille" ADD CONSTRAINT "Veille_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarnetEntry" ADD CONSTRAINT "CarnetEntry_parcoursParticipantId_fkey" FOREIGN KEY ("parcoursParticipantId") REFERENCES "ParcoursParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAction" ADD CONSTRAINT "PlanAction_parcoursParticipantId_fkey" FOREIGN KEY ("parcoursParticipantId") REFERENCES "ParcoursParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanActionEngagement" ADD CONSTRAINT "PlanActionEngagement_planActionId_fkey" FOREIGN KEY ("planActionId") REFERENCES "PlanAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefiSubmission" ADD CONSTRAINT "DefiSubmission_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefiSubmission" ADD CONSTRAINT "DefiSubmission_parcoursParticipantId_fkey" FOREIGN KEY ("parcoursParticipantId") REFERENCES "ParcoursParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteRendu" ADD CONSTRAINT "CompteRendu_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
