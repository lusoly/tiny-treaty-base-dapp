"use client";

import {
  FileSignature,
  Gavel,
  Loader2,
  PenLine,
  Search,
  ShieldCheck,
  Stamp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  MAX_COUNTERPARTY_LENGTH,
  MAX_STAMP_LENGTH,
  MAX_TERMS_LENGTH,
  MAX_TITLE_LENGTH,
  tinyTreatyAbi,
  tinyTreatyContractAddress,
} from "@/lib/tiny-treaty";

const STAMPS = ["AGREED", "PROMISE", "SHIP IT", "PARTNERS", "SIGNED"] as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddress(address?: Address) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return "--";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(value?: bigint) {
  if (!value) return "--";
  return new Date(Number(value) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sameAddress(left?: Address, right?: Address) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function friendlyError(error: unknown) {
  if (!(error instanceof Error)) return "Transaction was cancelled.";
  if (error.message.includes("User rejected")) return "Request cancelled in wallet.";
  if (error.message.includes("Proposer cannot accept")) {
    return "The proposer cannot accept their own treaty. Connect a different wallet to accept.";
  }
  if (error.message.includes("Already accepted")) return "This treaty is already accepted.";
  if (error.message.includes("Treaty missing")) return "No treaty exists for this ID yet.";
  return error.message;
}

function TreatySheet({
  title,
  counterparty,
  terms,
  stamp,
  proposer,
  signer,
  createdAt,
  signedAt,
  accepted,
}: {
  title: string;
  counterparty: string;
  terms: string;
  stamp: string;
  proposer?: Address;
  signer?: Address;
  createdAt?: bigint;
  signedAt?: bigint;
  accepted?: boolean;
}) {
  return (
    <div className="rounded-[3px] border border-[#171717] bg-[#f6f1e7] p-4 shadow-[12px_12px_0_#171717]">
      <div className="min-h-[650px] rounded-[2px] border border-[#171717] bg-[#fffaf0] p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#171717] pb-4">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#66615a]">
              Tiny Treaty
            </p>
            <h2 className="mt-3 break-words text-5xl font-black uppercase leading-none text-[#171717]">
              {title}
            </h2>
          </div>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[6px] border-[#b91c1c] text-center font-mono text-[11px] font-black uppercase leading-3 text-[#b91c1c]">
            {stamp}
          </div>
        </div>

        <section className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#66615a]">
              Counterparty
            </p>
            <p className="mt-2 text-2xl font-black text-[#171717]">{counterparty}</p>

            <p className="mt-6 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#66615a]">
              Terms
            </p>
            <p className="mt-3 whitespace-pre-wrap rounded-[2px] border border-[#171717] bg-[#f6f1e7] px-4 py-4 text-lg font-bold leading-8 text-[#262626]">
              {terms}
            </p>
          </div>

          <aside className="rounded-[2px] border border-[#171717] bg-[#f6f1e7] p-4 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#66615a]">
            <div className="border-b border-[#171717] pb-3">
              <p>Status</p>
              <p className={`mt-2 text-base ${accepted ? "text-[#047857]" : "text-[#b91c1c]"}`}>
                {accepted ? "Accepted" : "Pending"}
              </p>
            </div>
            <div className="border-b border-[#171717] py-3">
              <p>Proposer</p>
              <p className="mt-2 text-[#171717]">{shortAddress(proposer)}</p>
            </div>
            <div className="border-b border-[#171717] py-3">
              <p>Signer</p>
              <p className="mt-2 text-[#171717]">{shortAddress(signer)}</p>
            </div>
            <div className="border-b border-[#171717] py-3">
              <p>Created</p>
              <p className="mt-2 text-[#171717]">{formatDate(createdAt)}</p>
            </div>
            <div className="pt-3">
              <p>Signed</p>
              <p className="mt-2 text-[#171717]">{formatDate(signedAt)}</p>
            </div>
          </aside>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#171717] pt-5">
          <div className="h-24 rounded-[2px] border border-dashed border-[#171717] px-4 py-3">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#66615a]">
              Proposer mark
            </p>
            <p className="mt-3 text-xl font-black">{shortAddress(proposer)}</p>
          </div>
          <div className="h-24 rounded-[2px] border border-dashed border-[#171717] px-4 py-3">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#66615a]">
              Counter mark
            </p>
            <p className="mt-3 text-xl font-black">{shortAddress(signer)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TinyTreatyApp() {
  const [treatyIdInput, setTreatyIdInput] = useState("1");
  const [title, setTitle] = useState("Builder Pact");
  const [counterparty, setCounterparty] = useState("Launch partner");
  const [terms, setTerms] = useState(
    "We agree to ship the first useful version, share feedback clearly, and keep the work visible on Base.",
  );
  const [stamp, setStamp] = useState<(typeof STAMPS)[number]>("AGREED");
  const [status, setStatus] = useState("Create a small two-party treaty on Base.");
  const [lastAction, setLastAction] = useState<"create" | "accept" | null>(null);

  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  async function disconnectWallet() {
    try {
      if (connector) {
        await disconnectAsync({ connector });
      } else {
        await disconnectAsync();
      }
    } catch {}
  }
  const { switchChain, isPending: switching } = useSwitchChain();
  const {
    data: hash,
    writeContractAsync,
    isPending: writing,
  } = useWriteContract();
  const {
    data: receipt,
    isLoading: confirming,
  } =
    useWaitForTransactionReceipt({ hash });

  const selectedConnector =
    connectors.find((connector) => connector.id === "injected") ??
    connectors.find((connector) => connector.id === "baseAccount") ??
    connectors[0];
  const parsedTreatyId = BigInt(Math.max(1, Number(treatyIdInput || "1")));

  const treatyQuery = useReadContract({
    abi: tinyTreatyAbi,
    address: tinyTreatyContractAddress,
    functionName: "getTreaty",
    args: [parsedTreatyId],
    query: {
      enabled: Boolean(tinyTreatyContractAddress),
      refetchInterval: 12000,
    },
  });

  const totalQuery = useReadContract({
    abi: tinyTreatyAbi,
    address: tinyTreatyContractAddress,
    functionName: "nextTreatyId",
    query: {
      enabled: Boolean(tinyTreatyContractAddress),
      refetchInterval: 12000,
    },
  });

  const tuple = treatyQuery.data as
    | readonly [Address, Address, string, string, string, string, bigint, bigint, boolean]
    | undefined;

  const liveTreaty = useMemo(
    () =>
      tuple
        ? {
            proposer: tuple[0],
            signer: tuple[1],
            title: tuple[2],
            counterparty: tuple[3],
            terms: tuple[4],
            stamp: tuple[5],
            createdAt: tuple[6],
            signedAt: tuple[7],
            accepted: tuple[8],
          }
        : undefined,
    [tuple],
  );

  const totalTreaties = totalQuery.data ? Math.max(Number(totalQuery.data) - 1, 0) : 0;
  const previewTitle = liveTreaty?.title || title;
  const previewCounterparty = liveTreaty?.counterparty || counterparty;
  const previewTerms = liveTreaty?.terms || terms;
  const previewStamp = liveTreaty?.stamp || stamp;
  const hasLoadedTreaty = Boolean(
    liveTreaty?.proposer && liveTreaty.proposer !== ZERO_ADDRESS,
  );
  const currentWalletIsProposer = sameAddress(address, liveTreaty?.proposer);

  const validFields =
    title.trim().length > 0 &&
    title.trim().length <= MAX_TITLE_LENGTH &&
    counterparty.trim().length > 0 &&
    counterparty.trim().length <= MAX_COUNTERPARTY_LENGTH &&
    terms.trim().length > 0 &&
    terms.trim().length <= MAX_TERMS_LENGTH &&
    stamp.trim().length > 0 &&
    stamp.trim().length <= MAX_STAMP_LENGTH;

  const canCreate =
    Boolean(tinyTreatyContractAddress) &&
    isConnected &&
    chainId === base.id &&
    validFields;

  const createBlocker = !tinyTreatyContractAddress
    ? "Contract not deployed yet. Run npm run deploy:contract, then add NEXT_PUBLIC_TINY_TREATY_CONTRACT_ADDRESS."
    : !isConnected
      ? "Connect wallet first."
      : chainId !== base.id
        ? "Switch to Base first."
        : !validFields
          ? "Complete the treaty fields."
          : "";
  const acceptBlocker = !tinyTreatyContractAddress
    ? "Contract not deployed yet. Run npm run deploy:contract, then add NEXT_PUBLIC_TINY_TREATY_CONTRACT_ADDRESS."
    : !isConnected
      ? "Connect wallet first."
      : chainId !== base.id
        ? "Switch to Base first."
        : !hasLoadedTreaty
          ? "Load an existing treaty ID before accepting."
          : liveTreaty?.accepted
            ? "This treaty is already accepted."
            : currentWalletIsProposer
              ? "The proposer cannot accept their own treaty. Connect a different wallet to accept."
              : "";

  const statusText = status;

  useEffect(() => {
    if (!receipt) return;

    void totalQuery.refetch();
    void treatyQuery.refetch();

    if (lastAction === "create") {
      const logs = parseEventLogs({
        abi: tinyTreatyAbi,
        logs: receipt.logs,
        eventName: "TreatyCreated",
      });
      const treatyId = logs[0]?.args.treatyId;

      if (treatyId) {
        window.setTimeout(() => {
          setTreatyIdInput(treatyId.toString());
          setStatus(`Treaty #${treatyId.toString()} created on Base.`);
        }, 0);
        return;
      }

      window.setTimeout(() => {
        setStatus("Treaty created on Base. Load the newest Treaty ID.");
      }, 0);
      return;
    }

    if (lastAction === "accept") {
      window.setTimeout(() => {
        setStatus(`Treaty #${parsedTreatyId.toString()} accepted on Base.`);
      }, 0);
    }
  }, [lastAction, parsedTreatyId, receipt, totalQuery, treatyQuery]);

  async function connectWallet() {
    const connectorQueue = [
      connectors.find((connector) => connector.id === "injected"),
      connectors.find((connector) => connector.id === "baseAccount"),
      selectedConnector,
    ]
      .filter((connector): connector is NonNullable<typeof selectedConnector> =>
        Boolean(connector),
      )
      .filter(
        (connector, index, queue) =>
          queue.findIndex((item) => item.id === connector.id) === index,
      );

    if (connectorQueue.length === 0) {
      setStatus("No wallet connector found. Open this app inside Base App or a wallet browser.");
      return;
    }

    let lastError: unknown;
    setStatus("Opening wallet connection...");

    for (const connector of connectorQueue) {
      try {
        await connectAsync({ connector });
        setStatus("Wallet connected. Create or accept a treaty.");
        return;
      } catch (error) {
        lastError = error;
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : "Wallet connection was cancelled.";
    setStatus(
      message.includes("wallet_connect")
        ? "This browser does not support that wallet method. Refresh once, then open inside Base App or a wallet browser."
        : message,
    );
  }

  async function createTreaty() {
    const contractAddress = tinyTreatyContractAddress;

    if (!canCreate) {
      setStatus(createBlocker || "Check wallet, network, and treaty fields first.");
      return;
    }

    if (!contractAddress) {
      setStatus("Contract not deployed yet. Run npm run deploy:contract first.");
      return;
    }

    setStatus("Confirm treaty creation in your wallet.");
    try {
      setLastAction("create");
      await writeContractAsync({
        address: contractAddress,
        abi: tinyTreatyAbi,
        functionName: "createTreaty",
        args: [title.trim(), counterparty.trim(), terms.trim(), stamp.trim()],
        chainId: base.id,
      });
      setStatus("Treaty sent. Waiting for Base confirmation...");
    } catch (error) {
      setStatus(friendlyError(error));
    }
  }

  async function acceptTreaty() {
    const contractAddress = tinyTreatyContractAddress;

    if (acceptBlocker) {
      setStatus(acceptBlocker);
      return;
    }

    if (!contractAddress) {
      setStatus("Contract not deployed yet. Run npm run deploy:contract first.");
      return;
    }

    setStatus("Confirm treaty acceptance in your wallet.");
    try {
      setLastAction("accept");
      await writeContractAsync({
        address: contractAddress,
        abi: tinyTreatyAbi,
        functionName: "acceptTreaty",
        args: [parsedTreatyId],
        chainId: base.id,
      });
      setStatus("Treaty acceptance sent. Waiting for Base confirmation...");
    } catch (error) {
      setStatus(friendlyError(error));
    }
  }

  return (
    <main className="min-h-screen bg-[#191713] text-[#171717]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[3px] border border-[#f6f1e7] bg-[#fffaf0] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#7a7469]">
                Tiny Treaty
              </p>
              <h1 className="mt-2 text-4xl font-black leading-none">
                Sign a small pact.
              </h1>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#171717] bg-[#b91c1c] text-white">
              <Gavel className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[2px] border border-[#171717] bg-[#f6f1e7] p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                Treaties
              </p>
              <p className="mt-2 text-3xl font-black">{totalTreaties}</p>
            </div>
            <div className="rounded-[2px] border border-[#171717] bg-[#f6f1e7] p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                Chain
              </p>
              <p className="mt-2 text-xl font-black">Base</p>
            </div>
          </div>

          <section className="mt-4 rounded-[3px] border border-[#171717] bg-[#f6f1e7] p-4">
            <h2 className="text-xl font-black">Draft treaty</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={MAX_TITLE_LENGTH}
                  className="mt-1 w-full rounded-[2px] border border-[#171717] bg-[#fffaf0] px-3 py-3 font-black outline-none"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                  Counterparty
                </span>
                <input
                  value={counterparty}
                  onChange={(event) => setCounterparty(event.target.value)}
                  maxLength={MAX_COUNTERPARTY_LENGTH}
                  className="mt-1 w-full rounded-[2px] border border-[#171717] bg-[#fffaf0] px-3 py-3 font-black outline-none"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                  Terms
                </span>
                <textarea
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  maxLength={MAX_TERMS_LENGTH}
                  rows={5}
                  className="mt-1 w-full rounded-[2px] border border-[#171717] bg-[#fffaf0] px-3 py-3 text-sm font-bold leading-6 outline-none"
                />
              </label>

              <div>
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                  Stamp
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {STAMPS.map((value) => (
                    <button
                      key={value}
                      className={`rounded-[2px] border px-3 py-2 text-xs font-black ${
                        value === stamp
                          ? "border-[#b91c1c] bg-[#fee2e2] text-[#b91c1c]"
                          : "border-[#171717] bg-[#fffaf0]"
                      }`}
                      onClick={() => setStamp(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 space-y-3">
            {isConnected && chainId !== base.id ? (
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#171717] bg-[#171717] px-4 py-3 font-black text-white disabled:opacity-60"
                disabled={switching}
                onClick={() => switchChain({ chainId: base.id })}
              >
                {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Switch to Base
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[#171717] bg-[#171717] px-3 py-3 font-black text-white disabled:opacity-60"
                  disabled={writing || confirming}
                  onClick={createTreaty}
                >
                  {writing || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Create
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[#b91c1c] bg-[#fee2e2] px-3 py-3 font-black text-[#b91c1c] disabled:opacity-60"
                  disabled={writing || confirming}
                  onClick={acceptTreaty}
                >
                  {writing || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Accept
                </button>
              </div>
            )}

            {isConnected ? (
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#171717] bg-[#fffaf0] px-4 py-3 font-black"
                onClick={disconnectWallet}
              >
                {shortAddress(address)}
              </button>
            ) : (
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#171717] bg-[#fffaf0] px-4 py-3 font-black disabled:opacity-60"
                disabled={!selectedConnector || connecting}
                onClick={connectWallet}
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect wallet
              </button>
            )}

            <p className="rounded-[2px] border border-[#171717] bg-[#fffaf0] px-3 py-3 text-sm font-bold leading-6">
              {statusText}
            </p>
            {hash ? (
              <a
                className="block rounded-[2px] border border-[#171717] bg-[#f6f1e7] px-3 py-3 text-xs font-black leading-5 text-[#171717] underline"
                href={`https://basescan.org/tx/${hash}`}
                rel="noreferrer"
                target="_blank"
              >
                View transaction on BaseScan
              </a>
            ) : null}
            {(createBlocker || acceptBlocker) && isConnected ? (
              <p className="rounded-[2px] border border-[#171717] bg-[#f6f1e7] px-3 py-3 text-xs font-bold leading-5 text-[#57534e]">
                {acceptBlocker || createBlocker}
              </p>
            ) : null}
          </div>
        </aside>

        <section className="grid gap-4">
          <TreatySheet
            title={previewTitle}
            counterparty={previewCounterparty}
            terms={previewTerms}
            stamp={previewStamp}
            proposer={liveTreaty?.proposer}
            signer={liveTreaty?.signer}
            createdAt={liveTreaty?.createdAt}
            signedAt={liveTreaty?.signedAt}
            accepted={liveTreaty?.accepted}
          />

          <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className="rounded-[3px] border border-[#f6f1e7] bg-[#fffaf0] p-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                <h2 className="text-2xl font-black">Load treaty</h2>
              </div>
              <label className="mt-4 block">
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                  Treaty ID
                </span>
                <input
                  value={treatyIdInput}
                  onChange={(event) =>
                    setTreatyIdInput(event.target.value.replace(/\D/g, ""))
                  }
                  className="mt-1 w-full rounded-[2px] border border-[#171717] bg-[#fffaf0] px-3 py-3 text-2xl font-black outline-none"
                />
              </label>
            </div>

            <div className="rounded-[3px] border border-[#f6f1e7] bg-[#fffaf0] p-4">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#7a7469]">
                What it does
              </p>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-[#57534e]">
                Tiny Treaty lets one wallet create a small agreement and another
                wallet accept it on Base, leaving both marks and timestamps visible by ID.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#171717] bg-[#f6f1e7] px-3 py-2 text-xs font-black">
                  <FileSignature className="h-4 w-4" /> Two-party record
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#171717] bg-[#f6f1e7] px-3 py-2 text-xs font-black">
                  <Stamp className="h-4 w-4" /> Public status
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
