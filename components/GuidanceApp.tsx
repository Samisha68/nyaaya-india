"use client";
/* eslint-disable @next/next/no-html-link-for-pages, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */
import { FormEvent, useState } from "react";
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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (issue.trim().length < 12) return;
    setLoading(true);
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
      setResult(generateGuidance(`${issue}\n\nFollow-up question: ${question}\nFollow-up answer: ${followUpAnswer.trim()}`, debug));
      setLoading(false);
    }, 450);
  }

  return (
    <main>
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/"><img src="/brand-mark.png" alt="" />Nyaaya</a>
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
      {result && <Result guidance={result} showSource={showSource} followUpAnswer={followUpAnswer} setFollowUpAnswer={setFollowUpAnswer} answerFollowUp={answerFollowUp} answeredQuestion={answeredQuestion} loading={loading} />}
      <footer id="about">
        <div className="brand"><img src="/brand-mark.png" alt="" />Nyaaya</div>
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

function Result({ guidance: g, showSource, followUpAnswer, setFollowUpAnswer, answerFollowUp, answeredQuestion, loading }: { guidance: Guidance; showSource: (law: RelevantLaw) => void; followUpAnswer: string; setFollowUpAnswer: (value: string) => void; answerFollowUp: (event: FormEvent) => void; answeredQuestion: string; loading: boolean }) {
  return <section id="result" className="result-wrap">
    {g.emergency && <div className="emergency"><span>Immediate safety first</span><h2>If you are in immediate danger</h2><ul>{g.emergency_guidance?.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    <div className="result-head"><span className={`urgency ${g.urgency}`}>{g.urgency}</span><h2>{g.issue_summary}</h2><p>Based on the verified sources currently available.</p></div>
    <div className="result-grid"><div className="result-main">
      <ResultSection number="01" title="What you can do now"><ol className="actions">{[...g.immediate_actions, ...g.next_steps].slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ol></ResultSection>
      <ResultSection number="02" title="Rights that may be relevant">{g.relevant_laws.length ? g.relevant_laws.map((law) => <article className="law" key={law.provision}><div><span>{law.relevance}</span><b>{law.provision}</b></div><h3>{law.title}</h3><p>{law.explanation}</p><button onClick={() => showSource(law)}>View verified source <b>↗</b></button></article>) : <div className="no-law"><b>No specific constitutional provision shown</b><p>That is intentional: the current source does not contain a specific remedy for this category.</p></div>}</ResultSection>
      {g.missing_information.length > 0 && <ResultSection number="03" title="One thing we still need to know"><form className="follow-up" onSubmit={answerFollowUp}><label htmlFor="follow-up-answer">{g.missing_information[0]}</label><div><input id="follow-up-answer" value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Type your answer…" required /><button type="submit" disabled={loading}>{loading ? "Refining…" : "Refine my guidance"} <b>→</b></button></div></form></ResultSection>}
      {answeredQuestion && g.missing_information.length === 0 && <div className="answered-follow-up"><span>Answer considered</span><p>{answeredQuestion}</p><b>{followUpAnswer}</b></div>}
    </div><aside className="result-side"><div><span>Limits of this answer</span><p>{g.limitations}</p></div>{g.professional_help_recommended && <div><span>Professional help</span><p>A qualified lawyer or legal aid service may be appropriate for this situation.</p></div>}<a href="/sources">See what our database covers →</a></aside></div>
    {Boolean(g.debug) && <details className="debug"><summary>Retrieval trace</summary><pre>{JSON.stringify(g.debug, null, 2)}</pre></details>}
  </section>;
}

function ResultSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="result-section"><header><span>{number}</span><h2>{title}</h2></header>{children}</section>;
}
