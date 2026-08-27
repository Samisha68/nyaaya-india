"use client";
/* eslint-disable @next/next/no-html-link-for-pages, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */
import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { generateGuidance } from "@/lib/ai/guidance";
import data from "@/data/processed/constitution-india-2026.json";
import type { Guidance, LegalChunk, RelevantLaw } from "@/lib/legal/types";

export default function GuidanceApp() {
  const [issue, setIssue] = useState("");
  const [result, setResult] = useState<Guidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<LegalChunk | null>(null);
  const debug = false;
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [answeredQuestion, setAnsweredQuestion] = useState("");
  const [caseContext, setCaseContext] = useState("");
  const [caseId, setCaseId] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("nyaaya-current-case");
    if (!saved) return;
    try {
      const stored = JSON.parse(saved) as { id: string; issue: string; context: string; result: Guidance };
      // Restoring a previous case is intentionally a one-time client hydration step.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaseId(stored.id); setIssue(stored.issue); setCaseContext(stored.context); setResult(stored.result);
    } catch { sessionStorage.removeItem("nyaaya-current-case"); }
  }, []);

  useEffect(() => {
    if (caseId && result) sessionStorage.setItem("nyaaya-current-case", JSON.stringify({ id: caseId, issue, context: caseContext, result }));
  }, [caseId, issue, caseContext, result]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (issue.trim().length < 12) return;
    setLoading(true);
    if (!caseId) setCaseId(crypto.randomUUID().slice(0, 8));
    setCaseContext(issue.trim());
    setTimeout(() => {
      setResult(generateGuidance(issue, debug));
      setLoading(false);
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 30);
    }, 550);
  }

  function showSource(law: RelevantLaw) {
    setSource((data.chunks as LegalChunk[]).find((chunk) => law.citation_chunk_ids.includes(chunk.chunkId)) || null);
  }

  function answerFollowUp(event: FormEvent) {
    event.preventDefault();
    const question = result?.missing_information[0];
    if (!question || !followUpAnswer.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setAnsweredQuestion(question);
      setLastAnswer(followUpAnswer.trim());
      const updatedContext = `${caseContext || issue}\n\nFollow-up question: ${question}\nFollow-up answer: ${followUpAnswer.trim()}`;
      setCaseContext(updatedContext);
      setResult(generateGuidance(updatedContext, debug));
      setFollowUpAnswer("");
      setLoading(false);
    }, 450);
  }

  return (
    <main>
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/"><Image src="/brand-mark.png" alt="" width={40} height={40} />Nyaaya</a>
        <div className="navlinks"><a href="/sources">Sources</a><a href="#about">About</a></div>
      </nav>
      <section className={`hero ${result ? "hero-compact" : ""}`}>
        <h1>Tell us what<br /><em>happened.</em></h1>
        <p className="intro">Describe your situation in your own words. We’ll help you understand the rights and options that may be available.</p>
        <form className="issue-card" onSubmit={submit}>
          <label htmlFor="issue">What happened?</label>
          <textarea id="issue" value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="For example: Someone has not returned money they owe me…" minLength={12} required />
          <div className="form-bottom">
            <span>Your information stays private</span>
            <button type="submit" disabled={loading}>{loading ? "Checking verified law…" : "Find my options"} <b>→</b></button>
          </div>
        </form>
        {!result && <p className="promise">Understand your rights. Know your options. Take the next step.</p>}
      </section>
      {result && <Result guidance={result} caseId={caseId} showSource={showSource} followUpAnswer={followUpAnswer} setFollowUpAnswer={setFollowUpAnswer} answerFollowUp={answerFollowUp} answeredQuestion={answeredQuestion} lastAnswer={lastAnswer} loading={loading} />}
      <footer id="about">
        <div className="brand"><Image src="/brand-mark.png" alt="" width={36} height={36} />Nyaaya</div>
        <p>Legal information for everyone in India.</p>
        <small>This platform provides legal information and guidance, not legal advice. Laws and procedures may depend on your specific circumstances and jurisdiction.</small>
      </footer>
      {source && <div className="modal-bg" onClick={() => setSource(null)}>
        <aside className="source-drawer" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setSource(null)} aria-label="Close">×</button>
          <span className="source-kicker">Verified official source</span>
          <h2>Article {source.article}</h2><h3>{source.heading}</h3>
          <div className="source-text">{source.text}</div>
          <p><b>{source.title}</b><br />{source.authority}</p>
          <a className="official" href={source.sourceUrl} target="_blank" rel="noreferrer">View official document ↗</a>
        </aside>
      </div>}
    </main>
  );
}

function Result({ guidance: g, caseId, showSource, followUpAnswer, setFollowUpAnswer, answerFollowUp, answeredQuestion, lastAnswer, loading }: { guidance: Guidance; caseId: string; showSource: (law: RelevantLaw) => void; followUpAnswer: string; setFollowUpAnswer: (value: string) => void; answerFollowUp: (event: FormEvent) => void; answeredQuestion: string; lastAnswer: string; loading: boolean }) {
  return <section id="result" className="result-wrap">
    {g.emergency && <div className="emergency"><span>Immediate safety first</span><h2>If you are in immediate danger</h2><ul>{g.emergency_guidance?.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    <div className="result-head"><div className="result-labels"><span className={`urgency ${g.urgency}`}>{g.urgency}</span><span className="confidence">{g.confidence} confidence</span>{caseId && <span className="case-id">Case {caseId}</span>}</div><h2>What this looks like</h2><p>{g.issue_summary} Based on the facts you shared and the verified sources currently available.</p></div>
    {g.missing_information.length > 0 && <section className="clarification-card"><span>One detail will improve your guidance</span><form className="follow-up" onSubmit={answerFollowUp}><label htmlFor="follow-up-answer">{g.missing_information[0]}</label><div><input id="follow-up-answer" value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Type your answer…" required /><button type="submit" disabled={loading}>{loading ? "Refining…" : "Refine my guidance"} <b>→</b></button></div></form></section>}
    <div className="result-grid"><div className="result-main">
      <div className="route-card"><span>Best next route</span><h2>{g.best_next_route.route}</h2><p>{g.best_next_route.reason}</p></div>
      <ResultSection number="01" title="What you should do right now"><ol className="actions">{g.immediate_actions.map((item) => <li key={item}>{item}</li>)}</ol></ResultSection>
      <ResultSection number="02" title="Keep these documents and evidence"><ul className="evidence-list">{g.evidence_to_preserve.map((item) => <li key={item}>{item}</li>)}</ul></ResultSection>
      {g.avoid_actions.length > 0 && <ResultSection number="03" title="What not to do"><ul className="avoid-list">{g.avoid_actions.map((item) => <li key={item}>{item}</li>)}</ul></ResultSection>}
      <ResultSection number="04" title="Do you need police help?"><Decision status={humanStatus(g.police_help.status)} reason={g.police_help.reason} tone={g.police_help.status === "recommended" ? "urgent" : "neutral"} /></ResultSection>
      <ResultSection number="05" title="Do you need a lawyer?"><Decision status={humanStatus(g.lawyer_help.status)} reason={g.lawyer_help.reason} tone={g.lawyer_help.status === "urgent" || g.lawyer_help.status === "recommended" ? "important" : "neutral"} /></ResultSection>
      <ResultSection number="06" title="Government or legal route"><Decision status={formalActionLabel(g.formal_action.type)} reason={g.formal_action.reason} /><ul className="prerequisites">{g.formal_action.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></ResultSection>
      {g.rti.relevant && <ResultSection number="07" title="Could an RTI help?"><Decision status="Yes — for information, not relief" reason={g.rti.reason} /><h3 className="subhead">RTI may help you obtain</h3><ul className="prerequisites">{g.rti.possible_information_requests.map((item) => <li key={item}>{item}</li>)}</ul></ResultSection>}
      <ResultSection number="08" title="Legal protections">{g.relevant_laws.length ? g.relevant_laws.map((law) => <article className="law" key={law.provision}><div><span>{law.relevance}</span><b>{law.provision}</b></div><h3>{law.title}</h3><p>{law.explanation}</p><button onClick={() => showSource(law)}>View verified source <b>↗</b></button></article>) : <div className="no-law"><b>The specific law is not yet in our verified library</b><p>We can identify the likely route, but we won’t invent filing steps, deadlines, forms, fees or jurisdiction.</p></div>}</ResultSection>
      <ResultSection number="09" title="Escalation if this doesn’t work"><ol className="escalation">{g.escalation_path.map((item) => <li key={item}>{item}</li>)}</ol></ResultSection>
      {answeredQuestion && g.missing_information.length === 0 && <div className="answered-follow-up"><span>Answer considered</span><p>{answeredQuestion}</p><b>{lastAnswer}</b></div>}
    </div><aside className="result-side"><div><span>Limits of this answer</span><p>{g.limitations}</p></div>{g.professional_help_recommended && <div><span>Professional help</span><p>A qualified lawyer or legal aid service may be appropriate for this situation.</p></div>}<a href="/sources">See what our database covers →</a></aside></div>
    {Boolean(g.debug) && <details className="debug"><summary>Retrieval trace</summary><pre>{JSON.stringify(g.debug, null, 2)}</pre></details>}
  </section>;
}

function humanStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formalActionLabel(type: string) {
  const labels: Record<string, string> = { none: "No formal action yet", representation: "Written representation", legal_notice: "Consider a lawyer-drafted legal notice", grievance: "Written grievance first", complaint: "Written complaint", rti: "RTI request", petition: "Potential petition", writ: "Discuss a possible writ with a lawyer", tribunal: "Potential tribunal route", court: "Potential court route", other: "Formal route needs more facts" };
  return labels[type] || humanStatus(type);
}

function Decision({ status, reason, tone = "neutral" }: { status: string; reason: string; tone?: "neutral" | "important" | "urgent" }) {
  return <div className={`decision ${tone}`}><b>{status}</b><p>{reason}</p></div>;
}

function ResultSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="result-section"><header><span>{number}</span><h2>{title}</h2></header>{children}</section>;
}
