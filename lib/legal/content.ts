// Texto dos Termos de Serviço e da Política de Privacidade. Puro (sem servidor).
//
// O conteúdo descreve o que o produto FAZ de facto (dados tratados, subcontratantes, conservação, o que a
// eliminação apaga). Se o produto mudar (novo subcontratante, nova finalidade), este ficheiro tem de mudar
// com ele. Os dados da entidade responsável vêm de variáveis de ambiente, para não ficarem no código.
// ATENÇÃO: é um texto-base. Deve ser revisto por um advogado antes de o usar em produção.

export interface LegalEntity {
  name: string;
  address: string | null;
  email: string | null;
}

export type LegalBlock = string | string[]; // string = parágrafo, string[] = lista
export interface LegalSection {
  heading: string;
  body: LegalBlock[];
}
export interface LegalDoc {
  title: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = "terms" | "privacy";
export type LegalLang = "pt" | "en";

// Última revisão do texto (ISO). Mostra-se formatada na língua do leitor.
export const LEGAL_UPDATED = "2026-10-03";

export const legalEntityFromEnv = (): LegalEntity => ({
  name: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Zetrix",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || null,
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null,
});

// O espanhol usa a versão inglesa até haver tradução.
export const legalLang = (locale: string): LegalLang => (locale === "pt" ? "pt" : "en");

const contact = (entity: LegalEntity, lang: LegalLang) =>
  entity.email
    ? entity.email
    : lang === "pt"
      ? "o formulário da página de eliminação de dados (/data-deletion)"
      : "the form on the data deletion page (/data-deletion)";

export function legalDocument(kind: LegalKind, lang: LegalLang, entity: LegalEntity, formattedDate: string): LegalDoc {
  const builder = lang === "pt" ? (kind === "terms" ? termsPt : privacyPt) : kind === "terms" ? termsEn : privacyEn;
  const doc = builder(entity, contact(entity, lang));
  return { ...doc, updatedLabel: `${lang === "pt" ? "Última atualização" : "Last updated"}: ${formattedDate}` };
}

type Builder = (entity: LegalEntity, contactText: string) => Omit<LegalDoc, "updatedLabel">;

// ------------------------------------------------------------------------------------------------ PRIVACIDADE (PT)
const privacyPt: Builder = (e, c) => ({
  title: "Política de Privacidade",
  intro: `Esta política explica que dados pessoais a plataforma ${e.name} ("Zetrix") trata, para quê, com quem os partilha e como exercer os seus direitos.`,
  sections: [
    {
      heading: "1. Quem é o responsável",
      body: [
        `${e.name}${e.address ? `, com sede em ${e.address}` : ""}. Contacto para questões de privacidade: ${c}.`,
        "Para os dados da conta e da faturação dos nossos clientes somos o responsável pelo tratamento. Para as mensagens e os contactos dos clientes finais que escrevem às empresas através da plataforma, a empresa cliente é a responsável pelo tratamento e nós atuamos como subcontratante, tratando esses dados apenas para prestar o serviço e segundo as suas instruções.",
      ],
    },
    {
      heading: "2. Que dados tratamos",
      body: [
        [
          "Conta: nome, e-mail e palavra-passe (guardada pelo Supabase Auth apenas sob a forma de hash), organização a que pertence e o seu papel (Proprietário, Gestor ou Agente).",
          "Organização: nome, ficha do negócio (texto que a empresa escreve para orientar o assistente de IA) e definições.",
          "Canais ligados: identificadores das contas e páginas (WhatsApp Business, Instagram, Messenger), incluindo o identificador da conta WhatsApp Business e do número de telefone, e os tokens de acesso, que guardamos cifrados (AES-256-GCM).",
          "Conversas: as mensagens enviadas e recebidas, o identificador do cliente final em cada canal (número de telefone, ou identificador do Instagram/Messenger) e o nome de perfil, quando o canal o fornece. Se a transcrição de voz estiver ativa, também as notas de voz recebidas e o respetivo texto.",
          "Qualificação comercial: o nome, o e-mail e a necessidade que o cliente final indica nas conversas, extraídos pelo assistente de IA quando está ligado, e o estado comercial do contacto (novo, qualificado, cliente...). Também os pedidos de não receber mais mensagens.",
          "Marcações e pagamentos: as marcações feitas na agenda e os links de pagamento enviados (item, valor e se foi pago). Os pagamentos dos clientes finais são processados na conta Stripe da própria empresa; não guardamos dados de cartão.",
          "Faturação: o identificador de cliente e de subscrição no Stripe e o estado do plano. Não guardamos dados de cartão: são tratados pelo Stripe.",
          "Chaves de API: guardamos apenas o hash; a chave completa só é mostrada uma vez.",
          "Dados técnicos: endereço IP e registos de pedidos, usados para segurança e limitação de abusos.",
        ],
      ],
    },
    {
      heading: "3. Dados recebidos da Meta",
      body: [
        "Quando liga o Instagram ou o Messenger através do Login do Facebook, ou o WhatsApp através do registo incorporado (Embedded Signup) da Meta, recebemos a lista das páginas, contas profissionais de Instagram ou contas WhatsApp Business a que deu acesso e os respetivos tokens, e passamos a receber as mensagens que os clientes enviam a essas contas. Usamos estes dados apenas para receber, apresentar e responder a essas conversas. Não os vendemos nem os usamos para publicidade.",
        "Pode retirar o acesso a qualquer momento, desligando o canal na plataforma ou removendo a aplicação nas definições do Facebook (ver secção 8).",
      ],
    },
    {
      heading: "4. Para que usamos os dados e com que fundamento",
      body: [
        [
          "Prestar o serviço contratado (conta, Inbox, canais, assistente de IA, faturação): execução do contrato.",
          "Segurança, prevenção de abusos e limitação de pedidos: interesse legítimo.",
          "Cumprir obrigações legais, incluindo fiscais e de faturação: obrigação legal.",
          "Mensagens automáticas de seguimento: enviadas em nome da empresa a clientes que lhe escreveram, dentro da janela permitida pela Meta e nunca a quem pediu para não as receber (a empresa é a responsável por este tratamento).",
          "Comunicações sobre a conta e o serviço (por exemplo, convites de equipa): execução do contrato e interesse legítimo.",
        ],
      ],
    },
    {
      heading: "5. Com quem partilhamos (subcontratantes)",
      body: [
        [
          "Supabase: base de dados, autenticação e armazenamento de ficheiros (região da União Europeia).",
          "Vercel: alojamento da aplicação (região da Irlanda).",
          "Stripe: pagamentos e faturação das subscrições da Zetrix e, se a empresa ligar a sua conta (Stripe Connect), os links de pagamento dos seus clientes.",
          "Meta (WhatsApp, Instagram, Messenger): canais de mensagens.",
          "OpenRouter e os fornecedores de modelos de IA que ele encaminha: processam o texto das conversas para gerar respostas, extrair dados de qualificação e escrever mensagens de seguimento, quando o assistente de IA está ligado.",
          "OpenAI e Groq: transcrição de voz, apenas se a funcionalidade de voz estiver ativada. A síntese de voz é feita num servidor Voicebox da própria Zetrix, sem enviar o texto a terceiros.",
          "Resend: envio de e-mails da plataforma, quando configurado.",
        ],
        "Alguns destes fornecedores podem tratar dados fora do Espaço Económico Europeu. Nesses casos, as transferências assentam em cláusulas contratuais-tipo ou noutros mecanismos previstos no RGPD.",
      ],
    },
    {
      heading: "6. Quanto tempo conservamos os dados",
      body: [
        [
          "Conta, organização, canais e conversas: enquanto a conta existir. Ao eliminar a conta, apagamos a organização, os utilizadores, os canais e credenciais, as conversas, as mensagens, os contactos, as chaves de API, os convites e os ficheiros de áudio.",
          "Faturação: os registos e faturas que a lei exige ficam guardados no Stripe pelo prazo legal.",
          "Fila de envio de mensagens: os registos de envio concluídos são apagados ao fim de 7 dias.",
          "Dados técnicos de limitação de pedidos: apagados automaticamente após a janela de limitação.",
        ],
      ],
    },
    {
      heading: "7. Como protegemos os dados",
      body: [
        "Ligações cifradas (HTTPS), tokens de canais cifrados, palavras-passe sob a forma de hash, isolamento de dados por organização na base de dados (a base de dados não é acessível diretamente a partir do browser), acesso por papéis dentro de cada organização e limitação de pedidos contra abusos. Nenhum sistema é totalmente imune a falhas: se ocorrer uma violação de dados que o afete, comunicamos nos termos da lei.",
      ],
    },
    {
      heading: "8. Os seus direitos e a eliminação de dados",
      body: [
        "Tem direito de acesso, retificação, apagamento, limitação, portabilidade e oposição, e a apresentar queixa à autoridade de controlo (em Portugal, a CNPD).",
        [
          `Eliminar a conta: o Proprietário pode eliminar a organização e todos os dados em Configurações → Perfil → Eliminar conta. É imediato e irreversível.`,
          "Retirar a app do Facebook: se remover a aplicação nas definições do Facebook, apagamos automaticamente as ligações a canais feitas por si (pedido de eliminação de dados da Meta). Pode consultar o estado do pedido com o código de confirmação.",
          `Sem acesso à conta: peça a eliminação em /data-deletion. Confirmamos a sua identidade pelo e-mail antes de apagar e respondemos em 30 dias. Também pode escrever para ${c}.`,
          "Clientes finais das empresas: se escreveu a uma empresa através de WhatsApp, Instagram ou Messenger e quer aceder ou apagar essas mensagens, dirija-se à própria empresa, que é a responsável pelo tratamento.",
        ],
      ],
    },
    {
      heading: "9. Menores",
      body: ["O serviço destina-se a empresas e não é dirigido a menores de 16 anos. Não recolhemos conscientemente dados de menores."],
    },
    {
      heading: "10. Alterações a esta política",
      body: ["Podemos atualizar esta política. Alterações relevantes serão comunicadas na plataforma. A data da última atualização está no topo desta página."],
    },
  ],
});

// ------------------------------------------------------------------------------------------------ PRIVACY (EN)
const privacyEn: Builder = (e, c) => ({
  title: "Privacy Policy",
  intro: `This policy explains which personal data the ${e.name} platform ("Zetrix") processes, why, who it is shared with, and how to exercise your rights.`,
  sections: [
    {
      heading: "1. Who is responsible",
      body: [
        `${e.name}${e.address ? `, headquartered at ${e.address}` : ""}. Privacy contact: ${c}.`,
        "For our customers' account and billing data we are the data controller. For the messages and contacts of end customers who write to businesses through the platform, the business customer is the controller and we act as processor, handling that data only to provide the service and on their instructions.",
      ],
    },
    {
      heading: "2. What data we process",
      body: [
        [
          "Account: name, email and password (stored by Supabase Auth only as a hash), the organization you belong to and your role (Owner, Manager or Agent).",
          "Organization: name, business profile (text the business writes to guide the AI assistant) and settings.",
          "Connected channels: identifiers of accounts and pages (WhatsApp Business, Instagram, Messenger), including the WhatsApp Business account and phone number identifiers, and access tokens, which we store encrypted (AES-256-GCM).",
          "Conversations: messages sent and received, the end customer's identifier on each channel (phone number, or Instagram/Messenger identifier) and profile name when the channel provides it. If voice transcription is enabled, also received voice notes and their text.",
          "Lead qualification: the name, email and need the end customer states in conversations, extracted by the AI assistant when it is on, and the contact's commercial stage (new, qualified, customer...). Also requests to stop receiving messages.",
          "Appointments and payments: appointments booked in the calendar and payment links sent (item, amount and whether it was paid). End customers' payments are processed in the business's own Stripe account; we do not store card data.",
          "Billing: the Stripe customer and subscription identifiers and the plan status. We do not store card data: it is handled by Stripe.",
          "API keys: we only store the hash; the full key is shown once.",
          "Technical data: IP address and request logs, used for security and abuse prevention.",
        ],
      ],
    },
    {
      heading: "3. Data received from Meta",
      body: [
        "When you connect Instagram or Messenger through Facebook Login, or WhatsApp through Meta's Embedded Signup, we receive the list of pages, Instagram professional accounts or WhatsApp Business accounts you granted access to and their tokens, and we start receiving the messages customers send to those accounts. We use this data only to receive, display and reply to those conversations. We do not sell it or use it for advertising.",
        "You can withdraw access at any time by disconnecting the channel in the platform or by removing the app in your Facebook settings (see section 8).",
      ],
    },
    {
      heading: "4. Why we use the data and the legal basis",
      body: [
        [
          "Providing the contracted service (account, Inbox, channels, AI assistant, billing): performance of a contract.",
          "Security, abuse prevention and rate limiting: legitimate interest.",
          "Complying with legal obligations, including tax and invoicing: legal obligation.",
          "Automated follow-up messages: sent on the business's behalf to customers who wrote to it, within the window allowed by Meta and never to anyone who asked not to receive them (the business is the controller of this processing).",
          "Account and service communications (for example team invitations): performance of a contract and legitimate interest.",
        ],
      ],
    },
    {
      heading: "5. Who we share it with (sub-processors)",
      body: [
        [
          "Supabase: database, authentication and file storage (European Union region).",
          "Vercel: application hosting (Ireland region).",
          "Stripe: payments and billing of Zetrix subscriptions and, if the business connects its account (Stripe Connect), payment links for its customers.",
          "Meta (WhatsApp, Instagram, Messenger): messaging channels.",
          "OpenRouter and the AI model providers it routes to: process conversation text to generate replies, extract qualification data and write follow-up messages, when the AI assistant is on.",
          "OpenAI and Groq: voice transcription, only if the voice feature is enabled. Voice synthesis runs on Zetrix's own Voicebox server, without sending the text to third parties.",
          "Resend: platform emails, when configured.",
        ],
        "Some of these providers may process data outside the European Economic Area. In those cases, transfers rely on standard contractual clauses or other mechanisms provided by the GDPR.",
      ],
    },
    {
      heading: "6. How long we keep data",
      body: [
        [
          "Account, organization, channels and conversations: while the account exists. When you delete the account we erase the organization, users, channels and credentials, conversations, messages, contacts, API keys, invitations and audio files.",
          "Billing: records and invoices required by law remain with Stripe for the legal period.",
          "Outgoing message queue: completed send records are deleted after 7 days.",
          "Technical rate-limiting data: deleted automatically after the limiting window.",
        ],
      ],
    },
    {
      heading: "7. How we protect data",
      body: [
        "Encrypted connections (HTTPS), encrypted channel tokens, hashed passwords, per-organization data isolation in the database (the database is not directly accessible from the browser), role-based access within each organization and rate limiting against abuse. No system is immune to failures: if a data breach affects you, we will notify you as required by law.",
      ],
    },
    {
      heading: "8. Your rights and data deletion",
      body: [
        "You have the right of access, rectification, erasure, restriction, portability and objection, and to lodge a complaint with a supervisory authority.",
        [
          "Delete your account: the Owner can delete the organization and all its data in Settings → Profile → Delete account. It is immediate and irreversible.",
          "Remove the app from Facebook: if you remove the application in your Facebook settings, we automatically delete the channel connections made by you (Meta data deletion request). You can check the request status with the confirmation code.",
          `No access to the account: request deletion at /data-deletion. We verify your identity by email before deleting and reply within 30 days. You can also write to ${c}.`,
          "Businesses' end customers: if you wrote to a business through WhatsApp, Instagram or Messenger and want to access or delete those messages, contact the business, which is the data controller.",
        ],
      ],
    },
    {
      heading: "9. Children",
      body: ["The service is intended for businesses and is not directed at children under 16. We do not knowingly collect data from children."],
    },
    {
      heading: "10. Changes to this policy",
      body: ["We may update this policy. Material changes will be communicated in the platform. The date of the last update is at the top of this page."],
    },
  ],
});

// ------------------------------------------------------------------------------------------------ TERMOS (PT)
const termsPt: Builder = (e, c) => ({
  title: "Termos de Serviço",
  intro: `Estes termos regem o uso da plataforma ${e.name} ("Zetrix"). Ao criar uma conta ou usar o serviço, aceita-os.`,
  sections: [
    {
      heading: "1. O serviço",
      body: ["A Zetrix é uma plataforma de atendimento omnicanal: reúne numa Inbox as conversas de WhatsApp, Instagram e Messenger de uma empresa e permite responder por equipa ou através de um assistente de IA configurado pela empresa."],
    },
    {
      heading: "2. Conta e equipa",
      body: [
        "Tem de ter capacidade para vincular a sua empresa. É responsável por manter as credenciais seguras e por tudo o que se faça na sua conta, incluindo pelos membros da equipa que convidar e pelos papéis que lhes atribuir (Proprietário, Gestor, Agente). Deve fornecer informação verdadeira.",
      ],
    },
    {
      heading: "3. Teste grátis, planos e pagamentos",
      body: [
        [
          "Cada organização nova tem um teste grátis de 14 dias, sem cartão.",
          "Depois do teste, o acesso à Inbox, ao envio de mensagens e à ligação de canais exige uma subscrição ativa. As Configurações e a Faturação ficam sempre acessíveis.",
          "Os pagamentos são processados pelo Stripe. A subscrição renova automaticamente até ser cancelada, o que pode fazer a qualquer momento no portal de faturação; o cancelamento produz efeito conforme indicado no portal.",
          "Se um pagamento falhar, o acesso fica suspenso até o pagamento ser regularizado. Os seus dados ficam guardados.",
          "Salvo imposição legal, os valores já pagos não são reembolsáveis.",
        ],
      ],
    },
    {
      heading: "4. Uso aceitável",
      body: [
        "Compromete-se a usar o serviço de acordo com a lei e com as políticas da Meta, do WhatsApp Business, do Instagram e do Messenger. Em particular:",
        [
          "só contactar pessoas que tenham dado consentimento ou que lhe tenham escrito primeiro, e respeitar a janela de 24 horas para respostas livres;",
          "respeitar de imediato quem pedir para não receber mais mensagens (a plataforma já o faz nos seguimentos automáticos, mas a responsabilidade é sua);",
          "não enviar spam, conteúdo ilegal, enganoso, ofensivo ou que viole direitos de terceiros;",
          "não tentar contornar limites técnicos, aceder a dados de outras organizações nem comprometer a segurança do serviço;",
          "não usar o serviço para decisões automatizadas com efeitos legais sobre pessoas.",
        ],
      ],
    },
    {
      heading: "5. Canais de terceiros",
      body: ["A Zetrix depende de plataformas da Meta. Não somos afiliados à Meta. A Meta pode alterar, limitar ou suspender o acesso aos canais ou às contas; não controlamos nem garantimos essa disponibilidade."],
    },
    {
      heading: "6. Assistente de IA",
      body: [
        "O assistente gera respostas automáticas com base na ficha do negócio que a empresa escreve. As respostas de IA podem conter erros ou omissões. A empresa é responsável por rever a ficha, por supervisionar as conversas (pode pausar a IA em cada conversa) e pelo que o assistente diz em seu nome.",
        "Se a empresa o ativar, o assistente também pode guardar dados de qualificação dos clientes, enviar mensagens de seguimento a quem deixou de responder, marcar reuniões nos horários definidos pela empresa e enviar links de pagamento de itens do catálogo da empresa, cobrados na conta Stripe da própria empresa. A empresa define o catálogo, os preços e os horários, e é responsável pelas vendas, cobranças, reembolsos e obrigações fiscais perante os seus clientes; a Zetrix não é parte nessas transações nem recebe esses valores.",
      ],
    },
    {
      heading: "7. Dados e privacidade",
      body: [
        "O tratamento de dados pessoais descreve-se na Política de Privacidade. Quanto às mensagens e aos contactos dos seus clientes, a empresa é a responsável pelo tratamento e a Zetrix é subcontratante. É a empresa que tem de ter o fundamento legal e informar os seus clientes. Pode pedir-nos um acordo de tratamento de dados.",
      ],
    },
    {
      heading: "8. Propriedade intelectual",
      body: ["O software e a marca Zetrix pertencem-nos. Os dados e conteúdos que a empresa carrega continuam a ser seus; concede-nos apenas a licença necessária para prestar o serviço."],
    },
    {
      heading: "9. Disponibilidade e suporte",
      body: ["Esforçamo-nos por manter o serviço disponível, mas não garantimos funcionamento ininterrupto nem isento de erros. Podem existir manutenções e interrupções, incluindo as causadas por terceiros (Meta, Stripe, alojamento)."],
    },
    {
      heading: "10. Limitação de responsabilidade",
      body: ["Na medida permitida pela lei, não respondemos por danos indiretos, lucros cessantes ou perda de oportunidades, nem por falhas de terceiros. A nossa responsabilidade total limita-se ao valor pago pelo cliente nos 12 meses anteriores ao facto. Nada nestes termos exclui responsabilidade que a lei não permita excluir."],
    },
    {
      heading: "11. Suspensão e cessação",
      body: ["Pode eliminar a conta quando quiser (Configurações → Perfil), o que apaga os dados. Podemos suspender ou terminar o acesso em caso de violação destes termos, de uso abusivo ou de falta de pagamento."],
    },
    {
      heading: "12. Alterações",
      body: ["Podemos alterar estes termos. Alterações relevantes serão comunicadas com antecedência razoável. Continuar a usar o serviço depois da alteração significa que a aceita."],
    },
    {
      heading: "13. Lei aplicável e contacto",
      body: [`Estes termos regem-se pela lei do país da sede da entidade responsável indicada acima, e os litígios ficam sujeitos aos tribunais competentes desse país, sem prejuízo dos direitos imperativos dos consumidores. Questões sobre estes termos: ${c}.`],
    },
  ],
});

// ------------------------------------------------------------------------------------------------ TERMS (EN)
const termsEn: Builder = (e, c) => ({
  title: "Terms of Service",
  intro: `These terms govern the use of the ${e.name} platform ("Zetrix"). By creating an account or using the service, you accept them.`,
  sections: [
    {
      heading: "1. The service",
      body: ["Zetrix is an omnichannel customer service platform: it gathers a business's WhatsApp, Instagram and Messenger conversations in one Inbox and lets the team, or an AI assistant configured by the business, reply."],
    },
    {
      heading: "2. Account and team",
      body: [
        "You must have the authority to bind your business. You are responsible for keeping credentials secure and for everything done in your account, including by team members you invite and the roles you give them (Owner, Manager, Agent). You must provide accurate information.",
      ],
    },
    {
      heading: "3. Free trial, plans and payments",
      body: [
        [
          "Every new organization gets a 14-day free trial, no card required.",
          "After the trial, access to the Inbox, to sending messages and to connecting channels requires an active subscription. Settings and Billing always remain accessible.",
          "Payments are processed by Stripe. The subscription renews automatically until cancelled, which you can do at any time in the billing portal; cancellation takes effect as shown in the portal.",
          "If a payment fails, access is suspended until the payment is settled. Your data is kept.",
          "Except where required by law, amounts already paid are non-refundable.",
        ],
      ],
    },
    {
      heading: "4. Acceptable use",
      body: [
        "You agree to use the service in compliance with the law and with the policies of Meta, WhatsApp Business, Instagram and Messenger. In particular:",
        [
          "only contact people who have given consent or who wrote to you first, and respect the 24-hour window for free-form replies;",
          "immediately respect anyone who asks to stop receiving messages (the platform already does this for automated follow-ups, but the responsibility is yours);",
          "do not send spam or illegal, misleading or offensive content, or content that infringes third-party rights;",
          "do not try to bypass technical limits, access other organizations' data or compromise the security of the service;",
          "do not use the service for automated decisions with legal effects on people.",
        ],
      ],
    },
    {
      heading: "5. Third-party channels",
      body: ["Zetrix depends on Meta platforms. We are not affiliated with Meta. Meta may change, limit or suspend access to channels or accounts; we do not control or guarantee that availability."],
    },
    {
      heading: "6. AI assistant",
      body: [
        "The assistant generates automatic replies based on the business profile the business writes. AI replies may contain errors or omissions. The business is responsible for reviewing the profile, supervising conversations (AI can be paused per conversation) and what the assistant says on its behalf.",
        "If the business turns them on, the assistant can also store customer qualification data, send follow-up messages to people who stopped replying, book meetings in the hours the business defines and send payment links for items in the business's catalog, charged in the business's own Stripe account. The business defines the catalog, prices and hours, and is responsible for sales, charges, refunds and tax obligations toward its customers; Zetrix is not a party to those transactions and does not receive those amounts.",
      ],
    },
    {
      heading: "7. Data and privacy",
      body: [
        "Personal data processing is described in the Privacy Policy. For your customers' messages and contacts, the business is the data controller and Zetrix is the processor. The business must have a legal basis and inform its customers. You can ask us for a data processing agreement.",
      ],
    },
    {
      heading: "8. Intellectual property",
      body: ["The Zetrix software and brand belong to us. The data and content the business uploads remain its own; it grants us only the license needed to provide the service."],
    },
    {
      heading: "9. Availability and support",
      body: ["We work to keep the service available but do not guarantee uninterrupted or error-free operation. Maintenance and outages may occur, including those caused by third parties (Meta, Stripe, hosting)."],
    },
    {
      heading: "10. Limitation of liability",
      body: ["To the extent permitted by law, we are not liable for indirect damages, lost profits or lost opportunities, or for third-party failures. Our total liability is limited to the amount the customer paid in the 12 months before the event. Nothing in these terms excludes liability that cannot be excluded by law."],
    },
    {
      heading: "11. Suspension and termination",
      body: ["You can delete your account at any time (Settings → Profile), which erases the data. We may suspend or terminate access for breach of these terms, abusive use or non-payment."],
    },
    {
      heading: "12. Changes",
      body: ["We may change these terms. Material changes will be notified with reasonable advance notice. Continuing to use the service after a change means you accept it."],
    },
    {
      heading: "13. Governing law and contact",
      body: [`These terms are governed by the law of the country where the responsible entity named above is headquartered, and disputes are subject to the competent courts of that country, without prejudice to mandatory consumer rights. Questions about these terms: ${c}.`],
    },
  ],
});
