# Kwanza Flow · Pagamento por transferência bancária

Fluxo: o agente envia os dados bancários → o cliente paga e envia o comprovativo → um gestor valida no painel → o cliente recebe a confirmação.

## Configurar

1. **Definições → Pagamentos → Dados bancários** (`/dashboard/settings/payments`): banco, titular, IBAN (validado, incluindo o dígito de controlo), NIB e instruções opcionais. Só proprietários e gestores. Cada alteração fica no livro de auditoria.
2. O agente passa a ter a ferramenta `enviar_dados_bancarios`. Quando o cliente confirma que quer comprar (ou pede os dados para pagar), os dados seguem numa **mensagem à parte, exatos** (o agente nunca escreve o IBAN). Com catálogo de itens, o valor vem do catálogo; sem catálogo, vai só o nome do produto, sem valor (a IA não inventa preços).

## O comprovativo

- Uma **imagem ou documento** recebido DEPOIS de enviarmos os dados bancários (nos últimos 14 dias) é registado como comprovativo (`PaymentProof`, estado `PENDING`). Imagens sem esse contexto são tratadas como imagens normais.
- O ficheiro é guardado no Storage e aparece na conversa. A **IA fica em pausa** nessa conversa e o cliente recebe: «Recebemos o seu comprovativo. Por favor, aguarde um momento enquanto validamos o pagamento.»
- Funciona nos dois canais (API oficial da Meta e QR/OpenWA). Cada comprovativo regista-se uma só vez (chave única por mensagem).

## Validar

- **Pagamentos → Comprovativos** (`/dashboard/payments`) e um cartão por cima do campo de escrita da Inbox: ficheiro anexado + **Aprovar pagamento** / **Rejeitar** (com motivo opcional). Só proprietários e gestores decidem; a equipa de atendimento vê.
- **Aprovar:** estado «Pagamento concluído», o contacto passa a `WON`, o cliente recebe a confirmação no WhatsApp e a IA volta a responder.
- **Rejeitar:** o cliente recebe o pedido de novo comprovativo (com o motivo, se o escreveu) e a IA volta a responder.
- A decisão é atómica (dois cliques ou dois gestores nunca decidem duas vezes) e fica no livro de auditoria (modo síncrono, é dinheiro).

## Limites

- A validação é **manual**: o sistema não lê o comprovativo nem confirma o valor no banco.
- «Pagamento concluído» é o estado do comprovativo; não gera fatura nem altera o Stripe.
- Imagens enviadas antes de o cliente receber os dados bancários não contam como comprovativos.

## Imagens e documentos que não são comprovativos (canal QR/OpenWA)

- Uma imagem ou PDF recebido **sem** dados bancários enviados antes (por exemplo, a foto de uma peça para tirar dúvidas) já não fica sem resposta: o ficheiro é guardado e aparece na Inbox, e o agente responde com a **imagem à vista** (visão do modelo; JPEG/PNG/WebP/GIF até 4 MB). PDFs são guardados e reconhecidos, mas o agente não lê o conteúdo.
- O prompt do agente tem regras para: fecho de venda (envia os dados bancários logo que há intenção clara de compra), dúvidas visuais (cruza com a base de conhecimento, sem inventar stock nem preços) e comprovativos (agradece, «em análise», nunca confirma o pagamento).
- O IBAN **não** é injetado no prompt, de propósito: só a ferramenta `enviar_dados_bancarios` o envia, lendo os dados da organização, para o modelo nunca o poder alterar nem inventar.
- Limite: o canal oficial da Meta ainda não usa este caminho (imagens que não são comprovativos continuam sem resposta do agente).
