"use client";

import { useEffect, useState } from "react";
import { AgentActivityBar } from "@/components/AgentActivityBar";
import { AgentConsole } from "@/components/AgentConsole";
import { AuditLog } from "@/components/AuditLog";
import { AvocadoWhole, GuacamoleBowl } from "@/components/Avocado";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DecodePanel } from "@/components/DecodePanel";
import { DropZone } from "@/components/DropZone";
import { EntityPanel } from "@/components/EntityPanel";
import { Header } from "@/components/Header";
import { Meter } from "@/components/Meter";
import { SplitDocument } from "@/components/SplitDocument";
import { Strip } from "@/components/Strip";
import { TokenMap } from "@/components/TokenMap";
import { Panel } from "@/components/ui";
import { installGuards } from "@/lib/guards";
import { documentServedRatio } from "@/lib/store";
import { useDocumentSelection } from "@/lib/useSelection";
import { useStore } from "@/lib/useStore";
import type { AuditEvent } from "@/lib/types";
import { isWebMcpAvailable, localTools } from "@/lib/webmcp/api";
import { registerAllTools } from "@/lib/webmcp/tools";

export default function Workspace() {
  const state = useStore();
  const [tab, setTab] = useState("Document");
  /*
   * The list is a column beside the comparison at lg and above, and a sheet
   * over it below, so opening it by default on a narrow viewport would hide
   * the very thing the page exists to show. Read once at mount rather than
   * kept in sync with the viewport: past that first frame the state belongs
   * to whoever pressed the button. The export prerenders this page with no
   * window, and nothing reads this value until a document is loaded, so the
   * server branch only has to be the desktop default.
   */
  const [entitiesOpen, setEntitiesOpen] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 64rem)").matches,
  );
  const [seenAuditSeq, setSeenAuditSeq] = useState(0);
  useDocumentSelection();

  useEffect(() => {
    installGuards();
    return registerAllTools();
  }, []);

  // Registration flips a flag on the external store, which re-renders this
  // component. Reading the API before that would differ between the server
  // render and the client one.
  const registered = state.toolsRegistered;
  const webmcp = registered && isWebMcpAvailable();
  // What the browser confirmed holding, where it can be asked. The local
  // registry is only the fallback, because it counts what was offered rather
  // than what an agent can actually call.
  const toolCount = registered
    ? (state.browserTools?.accepted.length ?? localTools().length)
    : 0;
  const refused = state.browserTools?.rejected ?? [];

  // Calls an agent made that the record on the agent view has not shown the
  // user yet. Opening that view is what marks them seen, so the count cannot
  // survive having been looked at.
  const lastAuditSeq = state.audit.length > 0 ? state.audit[state.audit.length - 1].seq : 0;
  // Adjusted during render rather than in an effect: while the agent view is
  // open the record is on screen, so a call is seen the moment it lands, and
  // an effect would let the count flash before clearing itself.
  if (tab === "Agent" && seenAuditSeq !== lastAuditSeq) setSeenAuditSeq(lastAuditSeq);
  const unseen = state.audit.filter((event) => event.seq > seenAuditSeq && !event.boundary);

  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <Header
        state={state}
        webmcp={webmcp}
        toolCount={toolCount}
        tab={tab}
        onTab={setTab}
        entitiesOpen={entitiesOpen}
        onToggleEntities={() => setEntitiesOpen((open) => !open)}
        unseenCount={unseen.length}
      />

      {state.doc && tab === "Document" && (
        <AgentActivityBar
          attached={webmcp}
          unseen={unseen}
          onOpenRecord={() => setTab("Agent")}
        />
      )}

      {refused.length > 0 && (
        <div className="mono border-b border-stone bg-stone px-4 py-2 text-[0.6875rem] text-stone-text">
          The browser refused {refused.length} of {refused.length + toolCount} tool
          {refused.length + toolCount > 1 ? "s" : ""}, so an agent cannot call{" "}
          {refused.length > 1 ? "them" : "it"} and nothing they do will appear in the record.
          Latest: {refused[refused.length - 1].name} —{" "}
          {refused[refused.length - 1].reason.replace(/\.\s*$/, "")}.{" "}
          WebMCP needs an origin-isolated document; check that the page is served with{" "}
          <span className="text-text">Origin-Agent-Cluster: ?1</span> and that the{" "}
          <span className="text-text">tools</span> permission policy is not switched off.
        </div>
      )}

      {state.violations.length > 0 && (
        <div className="mono border-b border-stone bg-stone px-4 py-2 text-[0.6875rem] text-stone-text">
          Blocked at runtime: {state.violations.length} attempt
          {state.violations.length > 1 ? "s" : ""} to reach the network or write to storage. Latest:{" "}
          {state.violations[state.violations.length - 1].api} —{" "}
          {state.violations[state.violations.length - 1].detail}
        </div>
      )}

      <main className="min-h-0 flex-1 lg:overflow-auto">
        {!state.doc ? (
          <Start audit={state.audit} />
        ) : tab === "Document" ? (
          <DocumentView
            state={state}
            entitiesOpen={entitiesOpen}
            onCloseEntities={() => setEntitiesOpen(false)}
          />
        ) : (
          <AgentView state={state} agentAttached={webmcp} />
        )}
      </main>

      {state.pendingConfirmation && (
        <ConfirmDialog
          tool={state.pendingConfirmation.tool}
          summary={state.pendingConfirmation.summary}
        />
      )}
    </div>
  );
}

function Start({ audit }: { audit: AuditEvent[] }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="flex items-center gap-3">
        <AvocadoWhole size={26} />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-rind">
          Open a document
        </h1>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-dim">
        It is read here, in this tab. Nothing is uploaded and nothing is written to disk, so closing
        the tab is the delete button. You will see what was found, decide what an agent may receive,
        and watch every byte that leaves.
      </p>

      <div className="mt-7">
        <DropZone />
      </div>

      {/*
        An attached agent usually probes the tools before anyone has opened a
        file. Those calls are answered and recorded, so they are shown here
        rather than left invisible until a document exists: an empty record on
        a page that says "webmcp live" is indistinguishable from a broken one.
      */}
      {audit.length > 0 && (
        <section className="panel mt-8 overflow-hidden">
          <header className="flex items-center justify-between border-b border-line-soft bg-guac-wash px-4 py-2.5">
            <h2 className="label text-leaf">An agent has already called these tools</h2>
            <span className="label">{audit.length}</span>
          </header>
          <p className="border-b border-line-soft px-5 py-3 text-[0.8125rem] leading-relaxed text-text-dim">
            Nothing was disclosed: with no document open every tool returns a refusal. The record
            below is kept when you open a file, so the trail starts where the agent did.
          </p>
          <div className="max-h-56 overflow-auto">
            <AuditLog audit={audit} />
          </div>
        </section>
      )}

      <section className="panel mt-8 overflow-hidden">
        <header className="border-b border-line-soft bg-guac-wash px-4 py-2.5">
          <h2 className="label text-leaf">What this does not do</h2>
        </header>
        <ul className="space-y-3 px-5 py-4 text-[0.8125rem] leading-relaxed text-text-dim">
          <li>
            Detection is local patterns and a capitalization heuristic. A misspelling, an
            abbreviation or a partial mention can slip past it, which is why you review the marks
            before an agent reads anything.
          </li>
          <li>
            Substitution shrinks the exposed surface, it does not remove it. An agent asking
            enough questions can reconstruct the whole document, and nothing here stops it. What it
            reconstructs is this pseudonymized version, and the record says how much of it left.
          </li>
          <li>
            A pseudonym protects the name, not necessarily the person. Someone with distinctive
            behaviour can stay recognisable by inference alone.
          </li>
        </ul>
      </section>
    </div>
  );
}

function DocumentView({
  state,
  entitiesOpen,
  onCloseEntities,
}: {
  state: ReturnType<typeof useStore>;
  entitiesOpen: boolean;
  onCloseEntities: () => void;
}) {
  if (!state.doc) return null;

  return (
    <div className="flex min-h-0 lg:h-full">
      <div className="min-w-0 flex-1">
        <SplitDocument text={state.doc.text} entities={state.entities} />
      </div>

      {entitiesOpen && (
        <>
          {/* Below lg the list would squeeze the comparison, so it covers instead. */}
          <button
            aria-label="Close the list"
            onClick={onCloseEntities}
            className="fixed inset-0 z-20 bg-rind/30 lg:hidden"
          />
          <aside className="fixed inset-y-0 right-0 z-20 flex w-80 max-w-[85vw] flex-col border-l border-line bg-white lg:static lg:z-auto lg:w-[340px] lg:max-w-none lg:shrink-0">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
              <h2 className="label">Found in this file</h2>
              <div className="flex items-center gap-2">
                <span className="label">{state.entities.length}</span>
                <button
                  onClick={onCloseEntities}
                  title="Hide the list"
                  className="mono text-sm leading-none text-text-faint hover:text-text"
                >
                  ×
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1">
              <EntityPanel entities={state.entities} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function AgentView({
  state,
  agentAttached,
}: {
  state: ReturnType<typeof useStore>;
  agentAttached: boolean;
}) {
  const withheld = state.entities.filter((e) => e.level === "blocked").length;

  return (
    <div className="flex min-h-0 flex-col gap-px bg-line lg:h-full">
      <div className="grid shrink-0 grid-cols-1 gap-px bg-line lg:grid-cols-[23rem_1fr]">
        <div className="bg-white">
          <Meter
            servedRatio={documentServedRatio(state)}
            bytesServed={state.bytesServed}
            documentBytes={state.doc?.byteLength ?? 0}
            withheldCount={withheld}
          />
        </div>
        <div className="flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
            <div className="flex items-center gap-2">
              <GuacamoleBowl size={18} />
              <h2 className="label">Served to the agent</h2>
            </div>
            <span className="label">{state.transmitted.length} responses</span>
          </div>
          <div className="min-h-0 flex-1">
            <Strip chunks={state.transmitted} audit={state.audit} />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-line lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Agent console" bodyClassName="min-h-0" className="min-h-[20rem] rounded-none border-0">
          <AgentConsole />
        </Panel>

        <Panel
          title="Record of every call"
          aside={<span className="label">{state.audit.length}</span>}
          bodyClassName="min-h-0 overflow-auto"
          className="min-h-[20rem] rounded-none border-0"
        >
          <AuditLog audit={state.audit} />
        </Panel>

        <Panel title="Your key" bodyClassName="min-h-0" className="min-h-[20rem] rounded-none border-0">
          <TokenMap entities={state.entities} agentAttached={agentAttached} />
        </Panel>

        <Panel
          title="Read an answer"
          aside={
            state.findings.length > 0 ? (
              <span className="label text-guac-dark">{state.findings.length} notes</span>
            ) : undefined
          }
          bodyClassName="min-h-0"
          className="min-h-[20rem] rounded-none border-0"
        >
          {state.findings.length > 0 ? (
            <div className="flex h-full min-h-0 flex-col">
              <ul className="max-h-28 shrink-0 overflow-auto border-b border-line-soft">
                {state.findings.map((finding) => (
                  <li key={finding.id} className="mono px-3 py-1.5 text-[0.6875rem] text-text-dim">
                    <span className="text-guac-dark">{finding.sectionId}</span> {finding.note}
                  </li>
                ))}
              </ul>
              <div className="min-h-0 flex-1">
                <DecodePanel entities={state.entities} agentAttached={agentAttached} />
              </div>
            </div>
          ) : (
            <DecodePanel entities={state.entities} agentAttached={agentAttached} />
          )}
        </Panel>
      </div>
    </div>
  );
}
