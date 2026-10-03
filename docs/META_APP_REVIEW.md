# Meta: App Review, webhook e Embedded Signup

Guia para pôr a Zetrix a funcionar com clientes reais. O que é código já está feito; isto é o que se faz nos
painéis da Meta. Corra `npm run check:meta -- --url https://<dominio>` para verificar o lado do servidor.

## 1. Pré-requisitos (fora do código)

- **App da Meta** do tipo Empresa, ligada a um **Business Manager verificado** (Verificação do negócio). Sem ela,
  o acesso avançado às permissões não é concedido.
- **Tech Provider** (WhatsApp): necessário para o Embedded Signup com clientes de terceiros. Inscrição em
  Painel da app → WhatsApp → Início rápido / Tech Provider.
- Um domínio próprio com HTTPS e as variáveis de empresa definidas na Vercel (ver abaixo).

## 2. Variáveis (Vercel)

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET` | login do Facebook, SDK, assinatura dos webhooks e do callback |
| `WHATSAPP_VERIFY_TOKEN` | verificação do webhook |
| `NEXT_PUBLIC_META_WA_CONFIG_ID` | liga o Embedded Signup do WhatsApp (ver secção 5) |
| `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_ADDRESS`, `NEXT_PUBLIC_SUPPORT_EMAIL` | identidade da entidade nos Termos e na Privacidade; contacto de eliminação de dados |
| `NEXT_PUBLIC_APP_URL` | endereço público (`https://...`, sem barra no fim) |

`NEXT_PUBLIC_*` são incorporadas no build: depois de as definir, faça **redeploy**.

## 3. Definições da app (Painel → Definições da app → Básico)

| Campo | Valor |
|---|---|
| URL da Política de Privacidade | `https://<dominio>/en/privacy` |
| URL dos Termos de Serviço | `https://<dominio>/en/terms` |
| **URL de callback de eliminação de dados** | `https://<dominio>/api/meta/data-deletion` |
| Domínios da app | `<dominio>` |
| Ícone, categoria, e-mail de contacto | preencher (a Meta exige) |

**Login do Facebook para Empresas → Definições**: em *URIs de redirecionamento OAuth válidos*, adicione
`https://<dominio>/api/meta/oauth`.

**Webhooks** (um só endereço para tudo): Callback URL `https://<dominio>/api/meta/webhook`, token = o seu
`WHATSAPP_VERIFY_TOKEN`. Subscreva o campo `messages` dos objetos:
`whatsapp_business_account`, `instagram` e `page`. (O endereço antigo `/api/webhooks/whatsapp` continua a funcionar.)

## 4. Permissões a pedir e o que dizer ao revisor

Pede-se acesso avançado. Cole o texto de utilização (em inglês) em cada permissão e mostre-a no vídeo (secção 6).

| Permissão | Para quê, em palavras para o revisor |
|---|---|
| `pages_show_list`, `pages_read_engagement` | List the Facebook Pages the business owner chooses to connect, so they can pick which Pages to receive messages from. |
| `pages_messaging` | Receive messages that customers send to the connected Page and let the business (or its AI assistant, supervised by the business) reply inside the 24-hour window. |
| `pages_manage_metadata` | Subscribe the connected Page to the `messages` webhook so incoming messages are delivered to the business's inbox. |
| `instagram_basic` | Identify the Instagram professional account linked to the connected Page. |
| `instagram_manage_messages` | Receive and reply to Instagram direct messages sent to the connected professional account, inside the 24-hour window. |
| `whatsapp_business_management` | Via Embedded Signup, let the business connect its own WhatsApp Business Account and phone number and subscribe our app to its webhooks. |
| `whatsapp_business_messaging` | Receive customer messages and send replies from the business's WhatsApp number. |

Princípios que o produto já cumpre e que convém dizer: só se processam mensagens de contas que o dono ligou;
nada é vendido nem usado para publicidade; os tokens são guardados cifrados; o dono pode desligar o canal a
qualquer momento (Configurações → Canais → Desligar) ou eliminar a conta; o pedido de eliminação de dados da Meta
é automático.

## 5. WhatsApp Embedded Signup

1. Em **Login do Facebook para Empresas → Configurações**, crie uma configuração do tipo *WhatsApp Embedded Signup*
   (pede as permissões `whatsapp_business_management` e `whatsapp_business_messaging`). Copie o **ID da
   configuração** para `NEXT_PUBLIC_META_WA_CONFIG_ID` e faça redeploy.
2. Em **Configurações → Canais**, o cartão do WhatsApp passa a abrir o popup da Meta. O cliente liga o seu número
   sem copiar tokens; o ecrã manual (token + Phone ID) continua disponível como alternativa.
3. O servidor **não confia nos ids do browser**: troca o `code` por um token e confirma na Graph API que esse
   token vê o número e que o número pertence à conta WhatsApp Business indicada. Depois subscreve a nossa app
   a essa conta (`subscribed_apps`), regista o número na Cloud API e guarda a ligação (token cifrado).
4. **Por validar com a Meta real:** o registo do número usa um PIN aleatório de verificação em dois passos que
   não é guardado. Se um dia for preciso migrar o número, redefine-se o PIN no WhatsApp Manager.

## 6. Vídeo (screencast) para o App Review

A Meta pede um vídeo por permissão. Roteiro único que as cobre:

1. Abrir `https://<dominio>/en/register`, criar conta (mostrar a Política e os Termos ligados no formulário).
2. **Configurações → Canais → Instagram → Ligar conta**: mostrar o diálogo do Facebook com as permissões, escolher
   a página, e o canal a aparecer ligado.
3. Enviar uma mensagem para a conta de Instagram/página a partir de outro perfil; mostrar que chega à **Inbox**
   com o ícone do canal.
4. Responder na Inbox; mostrar a mensagem a chegar ao telemóvel (estado "Na fila" → "Enviada").
5. Repetir os passos 2-4 para Messenger e WhatsApp (Embedded Signup).
6. Mostrar **Desligar canal** e **Configurações → Perfil → Eliminar conta**, e `https://<dominio>/en/data-deletion`.

O revisor precisa de poder entrar: crie uma conta de teste e **ponha a organização em `active`** (o paywall bloqueia
depois do teste grátis de 14 dias) e dê as credenciais no formulário do App Review.

## 7. Antes de submeter

```bash
npm run check:meta -- --url https://<dominio>
```

Tem de dar 0 falhas: páginas legais públicas, cabeçalhos de segurança, callback de eliminação ativo, webhook a
verificar e a exigir assinatura, worker protegido.
