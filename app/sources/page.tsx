/* eslint-disable @next/next/no-html-link-for-pages */
import { legalSources } from "@/lib/legal/registry";

export const metadata = { title: "Verified legal sources — Nyaaya", description: "The official legal materials currently understood by Nyaaya." };

export default function Sources() {
  return <main>
    <nav className="nav"><a className="brand" href="/"><img src="/brand-mark.png" alt="" />Nyaaya</a><div className="navlinks"><a href="/sources">Sources</a><a href="/#about">About</a></div></nav>
    <section className="sources-page">
      <div className="source-intro"><span>Transparency by design</span><h1>Our legal sources.</h1><p>Every legal claim Nyaaya shows must trace back to a verified document in this registry. If the right source is not here, we tell you.</p></div>
      <div className="coverage"><span>Current coverage</span><strong>1</strong><p>verified official source</p></div>
      {legalSources.map((source) => <article className="source-card" key={source.id}><div className="document-mark">COI</div><div><span className="verified">● Verified official source</span><h2>{source.name}</h2><dl><div><dt>Authority</dt><dd>{source.authority}</dd></div><div><dt>Version</dt><dd>{source.versionLabel}</dd></div><div><dt>Jurisdiction</dt><dd>{source.jurisdiction}</dd></div><div><dt>Type</dt><dd>Constitution</dd></div></dl><a className="official" href={source.sourceUrl} target="_blank" rel="noreferrer">View official source ↗</a></div></article>)}
      <div className="sources-note"><h2>What this means for your answer</h2><p>Our knowledge layer currently covers constitutional provisions—not the full body of Indian law. Consumer, employment, tenancy, criminal procedure and other specialised laws will be added only from verified official documents. Until then, Nyaaya will clearly state when its database cannot support a specific remedy.</p></div>
    </section>
    <footer><div className="brand"><img src="/brand-mark.png" alt="" />Nyaaya</div><p>Legal information for everyone in India.</p><small>This platform provides legal information and guidance, not legal advice. Laws and procedures may depend on your specific circumstances and jurisdiction.</small></footer>
  </main>;
}
