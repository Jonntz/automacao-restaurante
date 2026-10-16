import { z } from "zod";

// Cada grupo valida só o que usa, para que testes e rotas não exijam o .env inteiro (FUN-RF-06).

type Fonte = Record<string, string | undefined>;

const obrigatoria = z.string().trim().min(1);

function validar<T extends z.ZodRawShape>(grupo: string, forma: T, fonte: Fonte): z.infer<z.ZodObject<T>> {
  const resultado = z.object(forma).safeParse(fonte);
  if (resultado.success) return resultado.data;
  const problemas = resultado.error.issues.map((i) => {
    const chave = i.path.join(".");
    return fonte[chave] === undefined || fonte[chave] === "" ? `${chave} (ausente)` : `${chave} (${i.message})`;
  });
  throw new Error(
    `Configuração inválida [${grupo}]: ${problemas.join(", ")}. Veja .env.example e preencha o seu .env.`,
  );
}

export const lerEnvBanco = (fonte: Fonte = process.env) =>
  validar(
    "banco",
    {
      DATABASE_URL: obrigatoria,
      DATABASE_AUTH_TOKEN: z.string().optional(),
    },
    fonte,
  );

export const lerEnvAdmin = (fonte: Fonte = process.env) =>
  validar(
    "admin",
    {
      ADMIN_EMAIL: obrigatoria,
      ADMIN_PASSWORD: obrigatoria,
      SESSION_SECRET: z.string().min(32, "precisa de pelo menos 32 caracteres"),
    },
    fonte,
  );

export const lerEnvBot = (fonte: Fonte = process.env) =>
  validar("bot", { BOT_API_KEY: z.string().min(16, "precisa de pelo menos 16 caracteres") }, fonte);

export const lerEnvN8n = (fonte: Fonte = process.env) =>
  validar(
    "n8n",
    {
      N8N_URL: z.url(),
      N8N_WEBHOOK_SECRET: z.string().min(16, "precisa de pelo menos 16 caracteres"),
    },
    fonte,
  );

export const lerEnvPagamento = (fonte: Fonte = process.env) =>
  validar(
    "pagamento",
    {
      PAGAMENTO_PROVEDOR: z.enum(["mock", "abacatepay"]).default("mock"),
      ABACATEPAY_API_KEY: z.string().optional(),
      ABACATEPAY_WEBHOOK_SECRET: z.string().optional(),
      ABACATEPAY_DEV_MODE: z
        .enum(["true", "false"])
        .default("true")
        .transform((v) => v === "true"),
    },
    fonte,
  );

export const lerEnvWhatsapp = (fonte: Fonte = process.env) =>
  validar(
    "whatsapp",
    {
      WHATSAPP_VERIFY_TOKEN: obrigatoria,
      WHATSAPP_APP_SECRET: obrigatoria,
    },
    fonte,
  );
