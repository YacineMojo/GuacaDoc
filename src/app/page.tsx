"use client";

import { useEffect, useState } from "react";
import { AgentConsole } from "@/components/AgentConsole";
import { AgentPane } from "@/components/AgentPane";
import { AuditLog } from "@/components/AuditLog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DecodePanel } from "@/components/DecodePanel";
import { DocumentPane } from "@/components/DocumentPane";
import { DropZone } from "@/components/DropZone";
import { SampleTransform } from "@/components/SampleTransform";
import { EntityPanel } from "@/components/EntityPanel";
import { Header } from "@/components/Header";
import { Meter } from "@/components/Meter";
import { Tape } from "@/components/Tape";
import { TokenMap } from "@/components/TokenMap";
import { Panel } from "@/components/ui";
import { PRODUCT_NAME } from "@/lib/branding";
import { installGuards } from "@/lib/guards";
import { budgetBytes, consumedRatio, documentConsumedRatio } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { isWebMcpAvailable, localTools } from "@/lib/webmcp/api";
import { registerAllTools } from "@/lib/webmcp/tools";

export default function Home() {
  const state = useStore();
  const [tab, setTab] = useState("Redaction");

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
      />

      {state.violations.length > 0 && (
        <div className="mono border-b border-stamp-dim bg-stamp/10 px-4 py-2 text-[0.6875rem] text-stamp">
          Blocked at runtime: {state.violations.length} attempt
          {state.violations.length > 1 ? "s" : ""} to reach the network or write
          to storage. Latest: {state.violations[state.violations.length - 1].api} —{" "}
          {state.violations[state.violations.length - 1].detail}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        {!state.doc ? (
          <Landing />
        ) : tab === "Redaction" ? (
          <RedactionView state={state} />
        ) : (
          <AgentView state={state} />
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

function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      <div className="grid items-start gap-10 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <p className="label">Agent-readable, not agent-owned</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.03] font-semibold tracking-tight text-text sm:text-5xl">
            Let an agent read your document
            <span className="block text-text-faint">without sending it.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-text-dim">
            {PRODUCT_NAME} loads a file into this tab and keeps it there. An
            agent reaches it only through WebMCP tools, and every answer those
            tools give passes a policy layer first: identifying values become
            stable tokens, a byte budget caps how much can ever leave, and a
            running strip shows you exactly what did.
          </p>

          <div className="mt-8">
            <DropZone />
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              {
                title: "Substitution, not trust",
                body: "The policy is JavaScript wrapped around every tool. It is not an instruction in a prompt, so a model cannot be talked out of it.",
              },
              {
                title: "A budget you set",
                body: "An agent may consume the share of the text you choose. When it runs out, tools refuse and say why, in a form the agent can act on.",
              },
              {
                title: "Search cannot probe",
                body: "Queries run against the redacted text, so an agent cannot learn a withheld name from whether a search hits.",
              },
              {
                title: "Nothing to leak later",
                body: "No server, no storage, no network. The tab is the whole system, and closing it is the delete button.",
              },
            ].map((item) => (
              <div key={item.title}>
                <dt className="font-display text-sm font-semibold text-text">{item.title}</dt>
                <dd className="mt-1.5 text-xs leading-relaxed text-text-dim">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:sticky lg:top-20">
          <SampleTransform />

          <div className="mt-6 border border-line-soft">
            <div className="border-b border-line-soft bg-ink-800 px-3 py-1.5">
              <span className="label">What this does not do</span>
            </div>
            <ul className="space-y-2.5 px-4 py-3.5 text-[0.6875rem] leading-relaxed text-text-dim">
              <li>
                Detection is local patterns and a capitalization heuristic. A
                misspelling, an abbreviation or a partial mention can slip past
                it, which is why you review the marks before the agent reads
                anything.
              </li>
              <li>
                Substitution shrinks the exposed surface, it does not remove it.
                An agent asking many narrow questions can still reconstruct part
                of the document, up to the budget you set.
              </li>
              <li>
                A pseudonym protects the name, not necessarily the person. An
                entity with distinctive behaviour can stay recognisable by
                inference alone.
              </li>
            </ul>
          </div>

          <p className="label mt-4 leading-relaxed">
            Open a document to begin · nothing is uploaded at any point
          </p>
        </div>
      </div>
    </div>
  );
}

function RedactionView({ state }: { state: ReturnType<typeof useStore> }) {
  if (!state.doc) return null;
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-px bg-line-soft xl:grid-cols-[1fr_1fr_360px]">
      <Panel
        title="The document"
        aside={<span className="label">click a mark to change it</span>}
        bodyClassName="min-h-0"
        className="min-h-[24rem]"
      >
        <DocumentPane text={state.doc.text} entities={state.entities} />
      </Panel>

      <Panel
        title="What the agent sees"
        aside={<span className="label">after substitution</span>}
        bodyClassName="min-h-0"
        className="min-h-[24rem]"
      >
        <AgentPane text={state.doc.text} entities={state.entities} />
      </Panel>

      <Panel
        title="Entities"
        aside={<span className="label">{state.entities.length}</span>}
        bodyClassName="min-h-0"
        className="min-h-[24rem]"
      >
        <EntityPanel entities={state.entities} />
      </Panel>
    </div>
  );
}

function AgentView({ state }: { state: ReturnType<typeof useStore> }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-px bg-line-soft">
      <div className="grid shrink-0 grid-cols-1 gap-px bg-line-soft lg:grid-cols-[22rem_1fr]">
        <div className="bg-ink-850">
          <Meter
            usedRatio={consumedRatio(state)}
            bytesSpent={state.bytesSpent}
            budget={budgetBytes(state)}
            documentRatio={documentConsumedRatio(state)}
          />
        </div>
        <div className="flex flex-col bg-ink-850">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
            <h2 className="label">What has left this tab</h2>
            <span className="label">{state.transmitted.length} transmissions</span>
          </div>
          <div className="flex-1">
            <Tape chunks={state.transmitted} audit={state.audit} />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-line-soft lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Agent console" bodyClassName="min-h-0" className="min-h-[20rem]">
          <AgentConsole />
        </Panel>

        <Panel
          title="Audit trail"
          aside={<span className="label">{state.audit.length} calls</span>}
          bodyClassName="min-h-0 overflow-auto"
          className="min-h-[20rem]"
        >
          <AuditLog audit={state.audit} />
        </Panel>

        <Panel title="Token mapping" bodyClassName="min-h-0" className="min-h-[20rem]">
          <TokenMap entities={state.entities} />
        </Panel>

        <Panel
          title="Decode an answer"
          aside={
            state.findings.length > 0 ? (
              <span className="label text-pass">{state.findings.length} findings</span>
            ) : undefined
          }
          bodyClassName="min-h-0"
          className="min-h-[20rem]"
        >
          {state.findings.length > 0 ? (
            <div className="flex h-full min-h-0 flex-col">
              <ul className="max-h-28 shrink-0 overflow-auto border-b border-line-soft">
                {state.findings.map((finding) => (
                  <li key={finding.id} className="mono px-3 py-1.5 text-[0.6875rem] text-text-dim">
                    <span className="text-pass">{finding.sectionId}</span> {finding.note}
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
