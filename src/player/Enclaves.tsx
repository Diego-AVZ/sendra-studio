import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EnclaveBlock, EnclaveManageBlock, EnclaveMineBlock, EnclaveOffersBlock, EnclavePortfolioBlock, Theme } from '@/schema/protocol';
import { explain, shortAddr } from '@/lib/uid';
import { ActionButton, TextField, cardStyle, headline } from '@/player/chrome';
import { useEnclaveSelection } from '@/player/enclaveSelection';
import { useWallet } from '@/web3/useWallet';
import {
  ACTION_COPY,
  LP_POOLS,
  ROUTE_GAP,
  acceptOffer,
  applyCapital,
  cancelOffer,
  createEnclave,
  depositCredit,
  deriveManage,
  fetchBook,
  fetchEnclave,
  fetchMyEnclaves,
  fetchOffers,
  finalizeEnclave,
  pauseEnclave,
  revokeEnclave,
  rolesFor,
  statusLabel,
  timeLeft,
  txLink,
  usd,
  validateTerms,
  type BookRow,
  type EnclaveListItem,
  type EnclaveOffer,
  type EnclaveRole,
  type EnclaveTerms,
  type ManageAction,
  type RoleFilter,
  type StudioEnclave,
} from '@/web3/enclaves';

type Live = { interactive: boolean };

const CAPITALS = [100, 500, 1000, 10000];
const DAYS = [7, 14, 30, 60, 90];
const STEPS = ['capital', 'window', 'split', 'review'] as const;
type Step = (typeof STEPS)[number] | 'fund';

function termsFrom(block: EnclaveBlock): EnclaveTerms {
  const capital = Number(block.capital);
  const amount = Number.isFinite(capital) ? capital : 0;
  const min = Number(block.minTx);
  const max = Number(block.maxTx);
  const fee = Math.max(0, Math.min(100, Math.round(block.feePct)));
  return {
    capitalAmount: amount,
    minUsdcPerTx: Number.isFinite(min) ? min : 0,
    maxUsdcPerTx: Number.isFinite(max) ? max : amount,
    durationDays: Math.max(1, block.days || 30),
    splitExecutorPct: fee,
    splitProviderPct: 100 - fee,
    description: block.description,
  };
}

function Desk({ theme, kicker, title, hint, children }: { theme: Theme; kicker: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden p-4" style={cardStyle(theme)}>
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
        {kicker}
      </p>
      <h3 className={`mt-1 text-2xl leading-none ${headline(theme.font)}`}>{title}</h3>
      {hint ? (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.muted }}>
          {hint}
        </p>
      ) : null}
      <div className="mt-3 min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

function Quiet({ theme, children }: { theme: Theme; children: string }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
      {children}
    </p>
  );
}

function Chip({ theme, on, children, onClick }: { theme: Theme; on: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs"
      style={{
        borderRadius: 999,
        background: on ? theme.accent : 'transparent',
        color: on ? theme.accentInk : theme.muted,
        border: `1px solid ${on ? theme.accent : `color-mix(in srgb, ${theme.ink} 18%, transparent)`}`,
      }}
    >
      {children}
    </button>
  );
}

function Ghost({ theme, children, disabled, onClick }: { theme: Theme; children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-2 text-xs disabled:opacity-40"
      style={{
        borderRadius: theme.radius,
        color: theme.ink,
        border: `1px solid color-mix(in srgb, ${theme.ink} 22%, transparent)`,
      }}
    >
      {children}
    </button>
  );
}

function Line({ theme, label, value }: { theme: Theme; label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span style={{ color: theme.muted }}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function money(value: bigint, signed = false) {
  const neg = value < 0n;
  const text = Number(neg ? -value : value) / 1e6;
  const formatted = text.toLocaleString('en', { style: 'currency', currency: 'USD' });
  if (!signed || value === 0n) return neg ? `-${formatted}` : formatted;
  return `${neg ? '-' : '+'}${formatted}`;
}

function tone(value: bigint) {
  return value > 0n ? 'pf-up' : value < 0n ? 'pf-down' : '';
}

export function CreateEnclaveDesk({ block, theme, live }: { block: EnclaveBlock; theme: Theme; live: Live }) {
  const wallet = useWallet();
  const { select, refresh } = useEnclaveSelection();
  const touched = useRef(false);
  const [mode, setMode] = useState<'guided' | 'form'>('guided');
  const [step, setStep] = useState<Step>('capital');
  const [terms, setTerms] = useState(() => termsFrom(block));
  const [openOperator, setOpenOperator] = useState(block.openOperator);
  const [operator, setOperator] = useState(block.operator);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<{ id: bigint; executor: `0x${string}`; hash: string } | null>(null);

  useEffect(() => {
    if (touched.current || created) return;
    setTerms(termsFrom(block));
    setOpenOperator(block.openOperator);
    setOperator(block.operator);
  }, [block, created]);

  function touch(recipe: (current: EnclaveTerms) => EnclaveTerms) {
    touched.current = true;
    setTerms(recipe);
  }

  async function submit() {
    setError('');
    setNote('');
    const problem = validateTerms(terms, openOperator, operator);
    if (problem) {
      setError(problem);
      return;
    }
    if (!live.interactive) {
      setError('This signs when the page is live.');
      return;
    }
    setBusy('Creating enclave…');
    try {
      const result = await createEnclave({ terms, allowedOperator: operator, openOperator });
      setCreated({ id: result.enclaveId, executor: result.enclaveAddress, hash: result.hash });
      select({ id: result.enclaveId.toString(), roles: ['lender'] });
      refresh();
      const funded = result.enclaveAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000';
      if (funded) setStep('fund');
      else setNote(`Offer #${result.enclaveId.toString()} is on the book.`);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy('');
    }
  }

  async function fund() {
    if (!created || !wallet.address) return;
    setError('');
    setBusy('Depositing credit…');
    try {
      const hash = await depositCredit(
        {
          id: created.id.toString(),
          contractAddress: created.executor,
          batchId: 0n,
          isPaused: false,
          isDeposited: false,
          creditInUsdWei: 0n,
          rpfpId: 0n,
          status: 'awaiting-deposit',
          lender: wallet.address,
          terms,
          endsAt: 0,
          capitalDeployed: 0,
          capitalAvailable: 0,
        },
        setBusy,
      );
      setNote(`Credit deposited. ${hash}`);
      refresh();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy('');
    }
  }

  const index = step === 'fund' ? 4 : STEPS.indexOf(step);
  const hash = created?.hash;

  return (
    <Desk theme={theme} kicker="Credit enclave" title={block.title || 'Create enclave'} hint={block.hint}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: theme.muted }}>
          {step === 'fund' ? 'Fund' : `Step ${index + 1} of 4`}
        </span>
        {step !== 'fund' ? (
          <button
            type="button"
            className="text-xs underline"
            style={{ color: theme.muted }}
            onClick={() => setMode((current) => (current === 'guided' ? 'form' : 'guided'))}
          >
            {mode === 'guided' ? 'Single form' : 'Guided steps'}
          </button>
        ) : null}
      </div>
      {step === 'fund' && created ? (
        <div className="grid gap-3">
          <p className="text-sm" style={{ color: theme.muted }}>
            Enclave #{created.id.toString()} is deployed. Deposit {usd(terms.capitalAmount)} so the operator can start.
          </p>
          <ActionButton theme={theme} disabled={Boolean(busy)} onClick={() => void fund()}>
            {busy || 'Deposit USDC'}
          </ActionButton>
        </div>
      ) : mode === 'form' || step === 'review' ? (
        <div className="grid gap-3">
          {mode === 'form' || step === 'review' ? (
            <>
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
                  Capital USDC
                </span>
                <TextField
                  theme={theme}
                  value={terms.capitalAmount ? String(terms.capitalAmount) : ''}
                  placeholder="1000"
                  onChange={(value) => touch((current) => applyCapital(current, Number(value) || 0))}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {CAPITALS.map((amount) => (
                  <Chip key={amount} theme={theme} on={terms.capitalAmount === amount} onClick={() => touch((current) => applyCapital(current, amount))}>
                    {amount >= 1000 ? `$${amount / 1000}k` : `$${amount}`}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
                    Min / position
                  </span>
                  <TextField
                    theme={theme}
                    value={terms.minUsdcPerTx ? String(terms.minUsdcPerTx) : ''}
                    onChange={(value) => touch((current) => ({ ...current, minUsdcPerTx: Number(value) || 0 }))}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
                    Max / position
                  </span>
                  <TextField
                    theme={theme}
                    value={terms.maxUsdcPerTx ? String(terms.maxUsdcPerTx) : ''}
                    onChange={(value) => touch((current) => ({ ...current, maxUsdcPerTx: Number(value) || 0 }))}
                  />
                </label>
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {DAYS.map((days) => (
              <Chip key={days} theme={theme} on={terms.durationDays === days} onClick={() => touch((current) => ({ ...current, durationDays: days }))}>
                {`${days}d`}
              </Chip>
            ))}
          </div>
          <label className="grid gap-1.5 text-sm">
            <span style={{ color: theme.muted }}>Operator share {terms.splitExecutorPct}% · lender {terms.splitProviderPct}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={terms.splitExecutorPct}
              onChange={(event) => {
                const fee = Number(event.target.value);
                touch((current) => ({ ...current, splitExecutorPct: fee, splitProviderPct: 100 - fee }));
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openOperator}
              onChange={(event) => {
                touched.current = true;
                setOpenOperator(event.target.checked);
              }}
            />
            Any operator can accept
          </label>
          {openOperator ? null : (
            <TextField
              theme={theme}
              value={operator}
              placeholder="Operator 0x…"
              onChange={(value) => {
                touched.current = true;
                setOperator(value.trim());
              }}
            />
          )}
          <TextField
            theme={theme}
            value={terms.description}
            placeholder="Note for the operator"
            onChange={(value) => touch((current) => ({ ...current, description: value }))}
          />
          {mode === 'guided' && step === 'review' ? (
            <div className="grid gap-1">
              <Line theme={theme} label="Capital" value={usd(terms.capitalAmount)} />
              <Line theme={theme} label="Per position" value={`${usd(terms.minUsdcPerTx)} – ${usd(terms.maxUsdcPerTx)}`} />
              <Line theme={theme} label="Window" value={`${terms.durationDays} days`} />
              <Line theme={theme} label="Split" value={`${terms.splitProviderPct}% lender / ${terms.splitExecutorPct}% operator`} />
            </div>
          ) : null}
          <div className="flex gap-2">
            {mode === 'guided' ? (
              <Ghost theme={theme} onClick={() => setStep('split')}>
                Back
              </Ghost>
            ) : null}
            <div className="min-w-0 flex-1">
              <ActionButton theme={theme} disabled={Boolean(busy)} onClick={() => void submit()}>
                {busy || block.button || 'Create offer'}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {step === 'capital' ? (
            <>
              <p className="text-sm" style={{ color: theme.muted }}>
                How much USDC do you want to lend?
              </p>
              <TextField
                theme={theme}
                value={terms.capitalAmount ? String(terms.capitalAmount) : ''}
                placeholder="0"
                onChange={(value) => touch((current) => applyCapital(current, Number(value) || 0))}
              />
              <div className="flex flex-wrap gap-2">
                {CAPITALS.map((amount) => (
                  <Chip key={amount} theme={theme} on={terms.capitalAmount === amount} onClick={() => touch((current) => applyCapital(current, amount))}>
                    {amount >= 1000 ? `$${amount / 1000}k` : `$${amount}`}
                  </Chip>
                ))}
              </div>
              <p className="text-xs" style={{ color: theme.muted }}>
                Per position {usd(terms.minUsdcPerTx)} – {usd(terms.maxUsdcPerTx)}. You can edit both on review.
              </p>
            </>
          ) : null}
          {step === 'window' ? (
            <>
              <p className="text-sm" style={{ color: theme.muted }}>
                For how long can the operator use the capital?
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((days) => (
                  <Chip key={days} theme={theme} on={terms.durationDays === days} onClick={() => touch((current) => ({ ...current, durationDays: days }))}>
                    {`${days} days`}
                  </Chip>
                ))}
              </div>
            </>
          ) : null}
          {step === 'split' ? (
            <>
              <p className="text-sm" style={{ color: theme.muted }}>
                Operator {terms.splitExecutorPct}% · lender {terms.splitProviderPct}%
              </p>
              <input
                type="range"
                min={0}
                max={100}
                value={terms.splitExecutorPct}
                onChange={(event) => {
                  const fee = Number(event.target.value);
                  touch((current) => ({ ...current, splitExecutorPct: fee, splitProviderPct: 100 - fee }));
                }}
              />
            </>
          ) : null}
          <div className="flex gap-2">
            {step !== 'capital' ? (
              <Ghost theme={theme} onClick={() => setStep(STEPS[Math.max(0, index - 1)])}>
                Back
              </Ghost>
            ) : null}
            <div className="min-w-0 flex-1">
              <ActionButton theme={theme} onClick={() => setStep(STEPS[index + 1])}>
                Continue
              </ActionButton>
            </div>
          </div>
        </div>
      )}
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
      {note ? (
        <p className="mt-3 text-sm" style={{ color: theme.muted }}>
          {note}{' '}
          {hash ? (
            <a href={txLink(hash)} target="_blank" rel="noreferrer" style={{ color: theme.accent }}>
              View on Arbiscan
            </a>
          ) : null}
        </p>
      ) : null}
    </Desk>
  );
}

export function MyEnclavesDesk({ block, theme, live }: { block: EnclaveMineBlock; theme: Theme; live: Live }) {
  const wallet = useWallet();
  const { pick, select, revision } = useEnclaveSelection();
  const [role, setRole] = useState<RoleFilter>('all');
  const [rows, setRows] = useState<EnclaveListItem[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const address = wallet.address;
    if (!address) {
      setRows([]);
      setNote(live.interactive ? 'Connect a wallet to see enclaves you lend or operate.' : 'Visitors connect a wallet and see enclaves they lend or operate.');
      setBusy(false);
      return;
    }
    let alive = true;
    setBusy(true);
    setNote('');
    void fetchMyEnclaves(address)
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setNote(list.length ? '' : 'No enclaves for this wallet yet.');
      })
      .catch((err: unknown) => {
        if (alive) setNote(explain(err));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [live.interactive, revision, wallet.address]);

  const shown = rows.filter((row) => role === 'all' || row.roles.includes(role));

  return (
    <Desk theme={theme} kicker="My enclaves" title={block.title || 'My enclaves'}>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['lender', 'Lender'],
            ['operator', 'Operator'],
          ] as const
        ).map(([value, label]) => (
          <Chip key={value} theme={theme} on={role === value} onClick={() => setRole(value)}>
            {label}
          </Chip>
        ))}
      </div>
      {busy ? <Quiet theme={theme}>Reading Arbitrum…</Quiet> : null}
      {!busy && note ? <Quiet theme={theme}>{note}</Quiet> : null}
      <div className="grid gap-2">
        {shown.map((row) => {
          const on = pick?.id === row.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => select({ id: row.id, roles: row.roles })}
              className="grid gap-1 px-3 py-2 text-left"
              style={{
                borderRadius: theme.radius,
                background: on ? `color-mix(in srgb, ${theme.accent} 18%, transparent)` : `color-mix(in srgb, ${theme.ink} 6%, transparent)`,
              }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <strong>#{row.id}</strong>
                <span>{usd(row.enclave.terms.capitalAmount)}</span>
              </span>
              <span className="text-xs" style={{ color: theme.muted }}>
                {row.roles.join(' · ')} · {statusLabel(row.enclave.status)}
                {row.enclave.endsAt ? ` · ${timeLeft(row.enclave.endsAt)}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </Desk>
  );
}

function OfferCard({
  theme,
  offer,
  live,
  selected,
  onSelect,
}: {
  theme: Theme;
  offer: EnclaveOffer;
  live: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const wallet = useWallet();
  const { select, refresh } = useEnclaveSelection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mine = wallet.address?.toLowerCase() === offer.lender.toLowerCase();

  async function accept() {
    onSelect();
    if (!live) {
      setError('This signs when the page is live.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const hash = await acceptOffer(offer.batchId, BigInt(offer.enclaveId));
      select({ id: offer.enclaveId, roles: ['operator'] });
      refresh();
      setError('');
      window.open(txLink(hash), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="grid gap-2 p-3"
      style={{
        borderRadius: theme.radius,
        background: selected ? `color-mix(in srgb, ${theme.accent} 16%, transparent)` : `color-mix(in srgb, ${theme.ink} 6%, transparent)`,
      }}
    >
      <button type="button" className="grid gap-1 text-left" onClick={onSelect}>
        <span className="flex items-baseline justify-between gap-2">
          <strong>#{offer.enclaveId}</strong>
          <span>{usd(offer.creditInUsd)}</span>
        </span>
        <span className="text-xs" style={{ color: theme.muted }}>
          {shortAddr(offer.lender)} · {offer.durationDays}d · you {offer.splitExecutorPct}% · {timeLeft(offer.deadline)}
        </span>
        <span className="text-xs" style={{ color: theme.muted }}>
          {usd(offer.minUsdcPerTx)} – {usd(offer.maxUsdcPerTx)} per position
        </span>
        {offer.description ? <span className="text-sm">{offer.description}</span> : null}
      </button>
      {mine ? (
        <Quiet theme={theme}>You posted this offer.</Quiet>
      ) : (
        <ActionButton theme={theme} disabled={busy} onClick={() => void accept()}>
          {busy ? 'Accepting…' : 'Accept offer'}
        </ActionButton>
      )}
      {error ? <p className="text-sm">{error}</p> : null}
    </article>
  );
}

export function OffersDesk({ block, theme, live }: { block: EnclaveOffersBlock; theme: Theme; live: Live }) {
  const { pick, select, revision } = useEnclaveSelection();
  const [offers, setOffers] = useState<EnclaveOffer[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setNote('');
    void fetchOffers()
      .then((list) => {
        if (!alive) return;
        setOffers(list);
        setNote(list.length ? '' : 'No open offers right now.');
      })
      .catch((err: unknown) => {
        if (alive) setNote(explain(err));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  return (
    <Desk theme={theme} kicker="Offers" title={block.title || 'Open offers'} hint="Accept one to become its operator.">
      {busy ? <Quiet theme={theme}>Reading Arbitrum…</Quiet> : null}
      {!busy && note ? <Quiet theme={theme}>{note}</Quiet> : null}
      <div className="grid gap-2">
        {offers.map((offer) => (
          <OfferCard
            key={offer.enclaveId}
            theme={theme}
            offer={offer}
            live={live.interactive}
            selected={pick?.id === offer.enclaveId}
            onSelect={() => {
              const roles: EnclaveRole[] = [];
              select({ id: offer.enclaveId, roles });
            }}
          />
        ))}
      </div>
    </Desk>
  );
}

export function ManageEnclaveDesk({ block, theme, live }: { block: EnclaveManageBlock; theme: Theme; live: Live }) {
  const wallet = useWallet();
  const { pick, revision, refresh } = useEnclaveSelection();
  const [enclave, setEnclave] = useState<StudioEnclave | null>(null);
  const [rows, setRows] = useState<BookRow[]>([]);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [action, setAction] = useState<ManageAction | null>(null);
  const [pool, setPool] = useState<(typeof LP_POOLS)[number]['id']>(LP_POOLS[0].id);
  const [amount, setAmount] = useState('');
  const [hash, setHash] = useState('');

  useEffect(() => {
    if (!pick) {
      setEnclave(null);
      setRows([]);
      setReady(false);
      setNote('');
      return;
    }
    let alive = true;
    setReady(false);
    setNote('');
    void fetchEnclave(pick.id)
      .then(async (next) => {
        const book = await fetchBook(next.contractAddress);
        if (!alive) return;
        setEnclave(next);
        setRows(book);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setEnclave(null);
        setNote(explain(err));
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [pick, revision]);

  if (!pick) {
    return (
      <Desk theme={theme} kicker="Manage" title={block.title || 'Manage enclave'}>
        <Quiet theme={theme}>Select an enclave.</Quiet>
      </Desk>
    );
  }

  const roles = enclave ? rolesFor(enclave, wallet.address) : pick.roles;
  const openCount = rows.filter((row) => row.active).length;
  const state = enclave ? deriveManage(enclave, roles.length ? roles : pick.roles, openCount, ready) : null;
  const meta = action ? ACTION_COPY[action] : null;

  async function run(kind: ManageAction) {
    if (!enclave) return;
    if (!live.interactive) {
      setError('This signs when the page is live.');
      return;
    }
    setError('');
    setHash('');
    setBusy(ACTION_COPY[kind].busy);
    try {
      if (kind === 'provide-liquidity') {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a USDC amount.');
        if (value < enclave.terms.minUsdcPerTx) throw new Error(`Minimum is ${usd(enclave.terms.minUsdcPerTx)}.`);
        if (value > enclave.terms.maxUsdcPerTx) throw new Error(`Maximum is ${usd(enclave.terms.maxUsdcPerTx)}.`);
        if (value > enclave.capitalAvailable) throw new Error('Amount exceeds the USDC still in the enclave.');
        if (!LP_POOLS.some((item) => item.id === pool)) throw new Error('Pick a whitelisted pool.');
        throw new Error(ROUTE_GAP);
      }
      const sent =
        kind === 'deposit-capital'
          ? await depositCredit(enclave, setBusy)
          : kind === 'finalize-enclave'
            ? await finalizeEnclave(enclave)
            : kind === 'pause-enclave'
              ? await pauseEnclave(enclave, true)
              : kind === 'unpause-enclave'
                ? await pauseEnclave(enclave, false)
                : kind === 'cancel-offer'
                  ? await cancelOffer(enclave)
                  : await revokeEnclave(enclave);
      setHash(sent);
      setAction(null);
      refresh();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy('');
    }
  }

  function askClose() {
    if (!live.interactive) {
      setError('This signs when the page is live.');
      return;
    }
    if (!state?.canOperate) {
      setError('Closing waits until the capital is deposited and the enclave is running.');
      return;
    }
    setError(ROUTE_GAP);
  }

  return (
    <Desk theme={theme} kicker="Manage" title={block.title || 'Manage enclave'}>
      {!enclave ? <Quiet theme={theme}>{note || 'Reading Arbitrum…'}</Quiet> : null}
      {enclave && state ? (
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <strong>#{enclave.id}</strong>
            <span className="text-xs" style={{ color: theme.muted }}>
              {(roles.length ? roles : pick.roles).join(' · ') || 'Viewer'} · {statusLabel(enclave.status)}
              {enclave.isPaused ? ' · Paused' : ''}
            </span>
          </div>
          {enclave.terms.description ? <p className="text-sm">{enclave.terms.description}</p> : null}
          {state.notice ? <Quiet theme={theme}>{state.notice}</Quiet> : null}
          <div className="grid gap-1">
            <Line theme={theme} label="Capital" value={usd(enclave.terms.capitalAmount)} />
            <Line theme={theme} label="Deployed" value={enclave.isDeposited ? usd(enclave.capitalDeployed) : '—'} />
            <Line theme={theme} label="Available" value={enclave.isDeposited ? usd(enclave.capitalAvailable) : '—'} />
            <Line theme={theme} label="Split" value={`${enclave.terms.splitProviderPct}% / ${enclave.terms.splitExecutorPct}%`} />
            <Line theme={theme} label="Per position" value={`${usd(enclave.terms.minUsdcPerTx)} – ${usd(enclave.terms.maxUsdcPerTx)}`} />
            <Line theme={theme} label={state.windowEnded ? 'Ended' : 'Ends'} value={enclave.endsAt ? timeLeft(enclave.endsAt) : '—'} />
            <Line
              theme={theme}
              label="Counterparty"
              value={
                state.isBoth
                  ? 'You, both sides'
                  : shortAddr((state.isLender ? enclave.operator : enclave.lender) || 'Waiting for an operator')
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {state.needsDeposit ? (
              <Ghost theme={theme} disabled={Boolean(busy)} onClick={() => setAction('deposit-capital')}>
                Deposit
              </Ghost>
            ) : null}
            {state.isOperator ? (
              <Ghost theme={theme} disabled={Boolean(busy) || !state.canProvide} onClick={() => setAction('provide-liquidity')}>
                Provide liquidity
              </Ghost>
            ) : null}
            {state.canFinalize ? (
              <Ghost theme={theme} disabled={Boolean(busy)} onClick={() => setAction('finalize-enclave')}>
                Finalize
              </Ghost>
            ) : null}
            {state.isLender && enclave.isDeposited && state.hasExec ? (
              <Ghost theme={theme} disabled={Boolean(busy)} onClick={() => setAction(enclave.isPaused ? 'unpause-enclave' : 'pause-enclave')}>
                {enclave.isPaused ? 'Unpause' : 'Pause'}
              </Ghost>
            ) : null}
            {state.openOffer ? (
              <Ghost theme={theme} disabled={Boolean(busy)} onClick={() => setAction('cancel-offer')}>
                Cancel offer
              </Ghost>
            ) : null}
            {state.canRevoke ? (
              <Ghost theme={theme} disabled={Boolean(busy)} onClick={() => setAction('revoke-enclave')}>
                Revoke
              </Ghost>
            ) : null}
          </div>
          {state.isOperator && !state.canProvide && state.provideBlocker ? <Quiet theme={theme}>{state.provideBlocker}</Quiet> : null}
          {meta ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">{meta.title}</p>
              <Quiet theme={theme}>{meta.description}</Quiet>
              {action === 'provide-liquidity' ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {LP_POOLS.map((item) => (
                      <Chip key={item.id} theme={theme} on={pool === item.id} onClick={() => setPool(item.id)}>
                        {item.label}
                      </Chip>
                    ))}
                  </div>
                  <TextField theme={theme} value={amount} placeholder="USDC" onChange={setAmount} />
                </>
              ) : null}
              <ActionButton theme={theme} disabled={Boolean(busy)} onClick={() => void run(action!)}>
                {busy || meta.cta}
              </ActionButton>
            </div>
          ) : null}
          <div className="grid gap-1">
            <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
              Positions · {openCount} open
            </span>
            {rows.length ? (
              rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {row.kind} #{row.id}
                  </span>
                  <span>
                    {row.active ? 'Open' : 'Closed'} {money(row.pnl, true)}
                  </span>
                  {state.isOperator && row.active ? (
                    <button type="button" className="text-xs underline" style={{ color: theme.muted }} onClick={askClose}>
                      Close
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <Quiet theme={theme}>
                {state.hasExec ? 'No positions in this enclave yet.' : 'The enclave account is created when an operator accepts.'}
              </Quiet>
            )}
          </div>
          {error ? <p className="text-sm">{error}</p> : null}
          {hash ? (
            <a className="text-sm" href={txLink(hash)} target="_blank" rel="noreferrer" style={{ color: theme.accent }}>
              View on Arbiscan
            </a>
          ) : null}
        </div>
      ) : null}
    </Desk>
  );
}

export function EnclavePortfolioDesk({ block, theme }: { block: EnclavePortfolioBlock; theme: Theme }) {
  const { pick, revision } = useEnclaveSelection();
  const [rows, setRows] = useState<BookRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [note, setNote] = useState('Select an enclave.');
  const [busy, setBusy] = useState(false);
  const [executor, setExecutor] = useState('');

  useEffect(() => {
    if (!pick) {
      setRows([]);
      setExecutor('');
      setNote('Select an enclave.');
      return;
    }
    let alive = true;
    setBusy(true);
    setNote('');
    void fetchEnclave(pick.id)
      .then(async (enclave) => {
        const book = await fetchBook(enclave.contractAddress);
        if (!alive) return;
        setExecutor(enclave.contractAddress);
        setRows(book);
        setNote(book.length ? '' : 'No positions in this enclave.');
      })
      .catch((err: unknown) => {
        if (alive) setNote(explain(err));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [pick, revision]);

  const shown = rows.filter((row) => (filter === 'all' ? true : filter === 'active' ? row.active : !row.active));
  const realized = rows.filter((row) => !row.active).reduce((sum, row) => sum + row.pnl, 0n);
  const unrealized = rows.filter((row) => row.active).reduce((sum, row) => sum + row.pnl, 0n);
  const profit = realized + unrealized;
  const open = rows.filter((row) => row.active).length;

  return (
    <section className="pf" aria-label={block.title || 'Enclave portfolio'}>
      <header className="pf-head">
        <div>
          <p className="pf-kicker">{pick ? `Enclave #${pick.id}` : 'Enclave portfolio'}</p>
          <p className="pf-hero">{money(unrealized)}</p>
        </div>
        <div className="pf-side">
          <div>
            <p className="pf-kicker">PnL</p>
            <p className={`pf-side-num ${tone(profit)}`}>{money(profit, true)}</p>
          </div>
          <div>
            <p className="pf-kicker">Open</p>
            <p className="pf-side-num">{open}</p>
            <p className="pf-sub">of {rows.length}</p>
          </div>
        </div>
      </header>
      <div className="pf-stats">
        {[
          ['Realized', money(realized, true), tone(realized)],
          ['Unrealized', money(unrealized, true), tone(unrealized)],
          ['Executor', executor && executor !== '0x0000000000000000000000000000000000000000' ? shortAddr(executor) : '—', ''],
          ['Book', pick ? `#${pick.id}` : '—', ''],
        ].map(([label, value, color]) => (
          <div key={label} className="pf-stat">
            <p className="pf-kicker">{label}</p>
            <strong className={color}>{value}</strong>
          </div>
        ))}
      </div>
      <div className="pf-body">
        <div className="pf-bar">
          {(['all', 'active', 'closed'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item === 'all' ? 'All' : item === 'active' ? 'Active' : 'Closed'}
            </button>
          ))}
        </div>
        <div className="pf-list">
          {shown.length ? (
            shown.map((row) => (
              <div key={row.id} className="pf-row">
                <span>{row.kind}</span>
                <span className="pf-id">#{row.id}</span>
                <span>{row.active ? 'Active' : 'Closed'}</span>
                <span className={tone(row.pnl)}>{money(row.pnl, true)}</span>
              </div>
            ))
          ) : (
            <p className="pf-empty">{busy ? 'Reading Arbitrum…' : note}</p>
          )}
        </div>
      </div>
      <span className="sr-only" style={{ color: theme.ink }}>
        {block.title}
      </span>
    </section>
  );
}
