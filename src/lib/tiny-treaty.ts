import type { Address } from "viem";

export const MAX_TITLE_LENGTH = 48;
export const MAX_COUNTERPARTY_LENGTH = 40;
export const MAX_TERMS_LENGTH = 240;
export const MAX_STAMP_LENGTH = 18;

export const tinyTreatyAbi = [
  {
    type: "event",
    name: "TreatyCreated",
    inputs: [
      { name: "treatyId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "counterparty", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TreatyAccepted",
    inputs: [
      { name: "treatyId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "signer", type: "address", indexed: true },
    ],
  },
  {
    type: "function",
    name: "createTreaty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "counterparty", type: "string" },
      { name: "terms", type: "string" },
      { name: "stamp", type: "string" },
    ],
    outputs: [{ name: "treatyId", type: "uint256" }],
  },
  {
    type: "function",
    name: "acceptTreaty",
    stateMutability: "nonpayable",
    inputs: [{ name: "treatyId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTreaty",
    stateMutability: "view",
    inputs: [{ name: "treatyId", type: "uint256" }],
    outputs: [
      { name: "proposer", type: "address" },
      { name: "signer", type: "address" },
      { name: "title", type: "string" },
      { name: "counterparty", type: "string" },
      { name: "terms", type: "string" },
      { name: "stamp", type: "string" },
      { name: "createdAt", type: "uint256" },
      { name: "signedAt", type: "uint256" },
      { name: "accepted", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "nextTreatyId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function isAddressLike(value?: string) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

const configuredTinyTreatyContractAddress =
  process.env.NEXT_PUBLIC_TINY_TREATY_CONTRACT_ADDRESS?.trim();

export const tinyTreatyContractAddress = isAddressLike(
  configuredTinyTreatyContractAddress,
)
  ? (configuredTinyTreatyContractAddress as Address)
  : undefined;
