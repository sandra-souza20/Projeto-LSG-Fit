// EMAIL_VERIFICATION=off libera o cadastro de qualquer e-mail sem o codigo de
// confirmacao. Necessario enquanto o Resend usa o remetente de teste
// (onboarding@resend.dev), que so entrega para o e-mail dono da conta Resend.
export const emailVerificationEnabled = process.env.EMAIL_VERIFICATION !== "off";
