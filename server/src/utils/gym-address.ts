import { AppError } from "./app-error.js";

// Endereço da academia em campos separados (docs/contrato-api.md, seção 5).
// Na API é um objeto `address` (ou null); no banco, colunas address_*.

const STATES = new Set([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export const GYM_ADDRESS_SELECT = {
    addressZipCode: true,
    addressStreet: true,
    addressNumber: true,
    addressComplement: true,
    addressDistrict: true,
    addressCity: true,
    addressState: true,
} as const;

type AddressColumns = {
    addressZipCode: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    addressCity: string | null;
    addressState: string | null;
};

export type GymAddress = {
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    // Uma linha pronta para exibir: "Rua X, 123 - Sala 2, Centro, São Paulo - SP, 01234-567".
    formatted: string;
};

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/**
 * Converte o `address` do corpo nas colunas do banco.
 * - `undefined`: não mexe no endereço (devolve `{}`);
 * - `null`: apaga o endereço;
 * - objeto: valida e grava. CEP com 8 dígitos (com ou sem hífen), UF válida e
 *   rua, número, bairro e cidade obrigatórios; complemento opcional.
 */
export function addressToColumns(input: unknown): Partial<AddressColumns> {
    if (input === undefined) return {};

    if (input === null) {
        return {
            addressZipCode: null,
            addressStreet: null,
            addressNumber: null,
            addressComplement: null,
            addressDistrict: null,
            addressCity: null,
            addressState: null,
        };
    }

    if (typeof input !== "object" || Array.isArray(input)) {
        throw new AppError("Endereço inválido.");
    }

    const raw = input as Record<string, unknown>;
    const zipCode = text(raw["zipCode"]).replace(/\D/g, "");
    const street = text(raw["street"]);
    const number = text(raw["number"]);
    const complement = text(raw["complement"]);
    const district = text(raw["district"]);
    const city = text(raw["city"]);
    const state = text(raw["state"]).toUpperCase();

    if (zipCode.length !== 8) throw new AppError("Informe um CEP válido (8 dígitos).");
    if (!street) throw new AppError("Informe a rua do endereço.");
    if (!number) throw new AppError("Informe o número do endereço (ou \"S/N\").");
    if (!district) throw new AppError("Informe o bairro do endereço.");
    if (!city) throw new AppError("Informe a cidade do endereço.");
    if (!STATES.has(state)) throw new AppError("Informe uma UF válida (ex.: SP).");

    return {
        addressZipCode: zipCode,
        addressStreet: street,
        addressNumber: number,
        addressComplement: complement || null,
        addressDistrict: district,
        addressCity: city,
        addressState: state,
    };
}

/** Colunas do banco → objeto da API (null se o endereço não estiver completo). */
export function serializeGymAddress(columns: AddressColumns): GymAddress | null {
    const { addressZipCode, addressStreet, addressNumber, addressDistrict, addressCity, addressState } = columns;

    if (!addressZipCode || !addressStreet || !addressNumber || !addressDistrict || !addressCity || !addressState) {
        return null;
    }

    const zipCode = `${addressZipCode.slice(0, 5)}-${addressZipCode.slice(5)}`;
    const streetLine = [`${addressStreet}, ${addressNumber}`, columns.addressComplement].filter(Boolean).join(" - ");

    return {
        zipCode: addressZipCode,
        street: addressStreet,
        number: addressNumber,
        complement: columns.addressComplement,
        district: addressDistrict,
        city: addressCity,
        state: addressState,
        formatted: `${streetLine}, ${addressDistrict}, ${addressCity} - ${addressState}, ${zipCode}`,
    };
}
