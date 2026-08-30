"use client";

import { useEffect, useState } from "react";
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
import { Button, Panel } from "@/components/ui";
import { installGuards } from "@/lib/guards";
import { budgetBytes, consumedRatio, documentConsumedRatio } from "@/lib/store";
import { useDocumentSelection } from "@/lib/useSelection";
import { useStore } from "@/lib/useStore";
import { isWebMcpAvailable, localTools } from "@/lib/webmcp/api";
import { registerAllTools } from "@/lib/webmcp/tools";

export default function Workspace() {
  const state = useStore();
  const [tab, setTab] = useState("Document");
  const [entitiesOpen, setEntitiesOpen] = useState(true);
  useDocumentSelection();

  useEffect(() => {
    installGuards();
    registerAllTools();
  }, []);

  // Registration flips a flag on the external store, which re-renders this
  // component. Reading the API before that would differ between the server
  // render and the client one.
  const registered = state.toolsRegistered;
  const webmcp = registered && isWebMcpAvailable();
  const toolCount = registered ? localTools().length : 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        state={state}
        webmcp={webmcp}
        toolCount={toolCount}
        tab={tab}
        onTab={setTab}
        entitiesOpen={entitiesOpen}
        onToggleEntities={() => setEntitiesOpen((open) => !open)}
      />

      {state.violations.length > 0 && (
        <div className="mono border-b border-stone bg-stone px-4 py-2 text-[0.6875rem] text-stone-text">
          Blocked at runtime: {state.violations.length} attempt
          {state.violations.length > 1 ? "s" : ""} to reach the network or write to storage. Latest:{" "}
          {state.violations[state.violations.length - 1].api} —{" "}
          {state.violations[state.violations.length - 1].detail}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        {!state.doc ? (
          <Start />
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

function Start() {
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
            Substitution shrinks the exposed surface, it does not remove it. An agent asking many
            narrow questions can still reconstruct part of the document, up to the budget you set.
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
    <div className="flex h-full min-h-0">
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
    <div className="flex h-full min-h-0 flex-col gap-px bg-line">
      <div className="grid shrink-0 grid-cols-1 gap-px bg-line lg:grid-cols-[23rem_1fr]">
        <div className="bg-white">
          <Meter
            usedRatio={consumedRatio(state)}
            bytesSpent={state.bytesSpent}
            budget={budgetBytes(state)}
            documentRatio={documentConsumedRatio(state)}
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
                <DecodePanel entities={state.entities} />
              </div>
            </div>
          ) : (
            <DecodePanel entities={state.entities} />
          )}
        </Panel>
      </div>
    </div>
  );
}
