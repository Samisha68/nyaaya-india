import { LegalRetriever } from "@/lib/retrieval/retriever";
import type { FormalActionType, Guidance, LawyerHelpStatus, PoliceHelpStatus, RelevantLaw, RetrievedChunk } from "@/lib/legal/types";

const retriever = new LegalRetriever();
const emergencyTerms = /\b(immediate danger|attacking|attack|violence|violent|kill|killing|suicide|self[- ]harm|sexual assault|sexual violence|rap(?:e|ed|ing)|child abuse|threatening me now)\b/i;
const statutory: Record<string, RegExp> = {
  "consumer dispute": /refund|fake product|seller|consumer|defective/,
  "tenancy or contractual dispute": /landlord|deposit|rent|tenant/,
  "employment dispute": /employer|salary|wages|fired|workplace/,
  "private debt or contractual dispute": /\b(?:owe[ds]?|owing|owning)\b|loan|money.*return|debt/,
};

function classify(issue: string) {
  if (/rap(?:e|ed|ing)|sexual assault|sexual violence/i.test(issue)) return "sexual violence or assault";
  if (/arrest|detain|custody|police station/i.test(issue)) return "arrest or detention";
  if (/discriminat|treated.*different|religion|caste|race/i.test(issue)) return "equality or discrimination";
  if (/speak|speech|criticis|instagram|post/i.test(issue)) return "freedom of expression";
  if (/school|education|child.*denied/i.test(issue)) return "education";
  if (/lawyer|legal aid|afford/i.test(issue)) return "access to legal help";
  for (const [category, pattern] of Object.entries(statutory)) if (pattern.test(issue)) return category;
  return "legal issue requiring more facts";
}

function classifyAll(issue: string, primary: string) {
  const domains: Array<[string, RegExp]> = [
    ["Employment", /employer|salary|wages|fired|termination|workplace/], ["Tenancy", /landlord|tenant|rent|security deposit/],
    ["Consumer", /refund|fake product|seller|consumer|defective|e-commerce/], ["Banking", /bank|account frozen|upi/],
    ["Loan recovery", /loan app|lender|nbfc|recovery agent|debt/], ["Cybercrime", /hack|online threat|leak.*photo|identity theft|otp|cyber/],
    ["Sexual violence", /rap(?:e|ed|ing)|sexual assault|sexual violence/],
    ["Fraud", /fraud|cheat|scam|fake product/], ["Police / criminal procedure", /police|arrest|detain|summons|custody/],
    ["Family", /divorce|marriage|matrimonial|spouse|custody of child/], ["Domestic violence", /domestic violence|husband.*beat|wife.*beat/],
    ["Property", /property|builder|flat|land ownership/], ["Business / contracts", /contract|agreement|invoice|payment due/],
    ["Education", /school|college|university|education|certificate/], ["Government services", /government|municipal|department|public authority|application status/],
    ["Privacy / data", /privacy|personal data|contacts|pan|aadhaar/], ["Discrimination", /discriminat|caste|religion|race|pregnant/],
    ["Harassment", /harass|threat|stalk|intimidat/], ["Defamation", /defam|false allegation/], ["Insurance", /insurance|claim rejected/],
  ];
  const matched = domains.filter(([, pattern]) => pattern.test(issue)).map(([name]) => name);
  return matched.length ? matched : [primary.replace(/(^| )\w/g, (letter) => letter.toUpperCase())];
}

function sentence(text: string) {
  return text.replace(/^\s*(?:\d+\[)?\d+[A-Z]?\.\s*/i, "").split(/(?<=[.!?])\s+/)[0].replace(/\s+/g, " ").slice(0, 420);
}

function isVerified(result: RetrievedChunk) {
  return Boolean(result.chunk.chunkId && result.chunk.article && result.chunk.text && result.chunk.text.includes(`${result.chunk.article}.`));
}

function relevance(score: number): "direct" | "strong" | "supporting" {
  return score > .32 ? "direct" : score > .18 ? "strong" : "supporting";
}

function practicalDetails(category: string, issue: string) {
  const map: Record<string, { evidence: string[]; avoid: string[] }> = {
    "private debt or contractual dispute": { evidence: ["Loan agreement or written repayment promise", "Bank or UPI transfer records", "Messages acknowledging the amount or repayment date"], avoid: ["Do not make threats or repeatedly harass the other person", "Do not ignore a formal notice, summons or stated response deadline"] },
    "tenancy or contractual dispute": { evidence: ["Rental agreement", "Deposit and rent payment records", "Move-in and move-out photographs", "Messages, notices and claimed deduction details"], avoid: ["Do not change locks, withhold property or sign a settlement you do not understand", "Do not rely only on calls; keep requests documented"] },
    "consumer dispute": { evidence: ["Invoice and payment record", "Product listing, warranty and delivery record", "Photographs or an unboxing video", "Seller and platform complaint history"], avoid: ["Do not discard the product, packaging or complaint reference numbers", "Do not send more money to anyone claiming they can recover the loss"] },
    "employment dispute": { evidence: ["Employment agreement or offer letter", "Payslips, bank credits and attendance records", "Termination, warning and HR communications"], avoid: ["Do not sign a resignation or settlement you do not understand", "Do not surrender original records without keeping copies"] },
    "arrest or detention": { evidence: ["Names or identifying details of officers", "Station, location and times", "Any arrest memo, notice or other document provided"], avoid: ["Do not resist physically", "Do not sign a statement you do not understand; ask for a lawyer"] },
  };
  if (/legal notice|summons|court notice/i.test(issue)) return { evidence: ["Complete notice or summons, including envelope and attachments", "Proof of the date it was received", "Documents and communications relating to the allegations"], avoid: ["Do not ignore the stated response or appearance date", "Do not send an admission or sign a settlement before understanding its effect"] };
  if (/loan app|calling my contacts|contact list/i.test(issue)) return { evidence: ["Screenshots of threats and caller details", "Call logs and recordings lawfully available to you", "Loan documents and the identity of the bank or NBFC", "Evidence that contacts were accessed or contacted"], avoid: ["Do not delete messages or call logs", "Do not share OTPs or pay an unverified recovery intermediary"] };
  return map[category] || { evidence: ["Dated written account of events", "Relevant messages, notices, receipts and photographs", "Proof of any complaint or representation already submitted"], avoid: [] };
}

function categoryGuidance(category: string, issue: string) {
  const hasFollowUp = /follow-up answer:/i.test(issue);
  switch (category) {
    case "private debt or contractual dispute": {
      const loanApp = /loan app|recovery agent|calling my contacts|contact list/i.test(issue);
      const otherOwesUser = /(?:someone|they|he|she|friend|person).{0,35}(?:owe[ds]? me|not (?:paid|returned)|pay me back)|money they owe me/i.test(issue);
      const userOwesOther = /\bI owe|I borrowed|my debt/i.test(issue);
      const directionKnown = otherOwesUser || userOwesOther || (hasFollowUp && /\b(i owe|owe me|owes me|they owe|other person)\b/i.test(issue));
      return {
        actions: otherOwesUser ? [
          "Collect proof of the loan or amount due, including bank transfers, messages, receipts and any written promise to repay.",
          "Prepare a short timeline showing when the money was given, the agreed repayment date and each request you have made.",
          "Send a calm written repayment request stating the amount, basis of the debt and a reasonable deadline.",
        ] : userOwesOther ? [
          "Check the agreed amount, repayment date, interest and any written terms before accepting the demand as accurate.",
          "Keep all payment records and communicate in writing about any repayment plan you can realistically follow.",
          "Do not ignore a formal legal notice or court document; note its response deadline and seek legal help promptly.",
        ] : [
          "Collect messages, bank records, receipts and any agreement that shows who paid whom and why.",
          "Write down the amount, the agreed repayment date and what has happened since.",
          "Keep future communication about the money in writing and avoid threats or harassment.",
        ],
        next: ["If informal requests fail, a lawyer can assess a legal notice or civil recovery route based on the agreement, amount and limitation period."],
        questions: loanApp && !/follow-up question:.*bank\/NBFC/i.test(issue)
          ? ["Do you know which bank or NBFC issued the loan, and have the messages included threats?"]
          : directionKnown ? ["What proof do you have of the amount and the agreed repayment date?"] : ["Do you owe the money, or does the other person owe you?"],
      };
    }
    case "tenancy or contractual dispute":
      return {
        actions: [
          "Gather the tenancy agreement, deposit or rent receipts, property photographs, notices and messages with the landlord or tenant.",
          "Write a dated timeline of the disputed payment, notice, repair, eviction or deposit issue.",
          "Send a written request describing the problem and the specific outcome you want, and keep proof of delivery.",
        ],
        next: ["Before withholding rent, changing locks or vacating, get advice on the tenancy rules that apply where the property is located."],
        questions: !hasFollowUp && /deposit/i.test(issue) ? ["Which state did the tenancy occur in?"] : !hasFollowUp ? ["Is this mainly about rent, eviction, repairs, or return of a security deposit?"] : !/agreement|written lease|rental contract/i.test(issue) ? ["Do you have a written rental agreement, and does it state when the deposit must be returned?"] : [],
      };
    case "consumer dispute":
      return {
        actions: [
          "Save the invoice, payment record, product listing, warranty, photographs and all communication with the seller.",
          "Write to the seller stating the defect or failed service and the refund, replacement or repair you want.",
          "Record the seller's response and any complaint or ticket number before escalating the dispute.",
        ],
        next: ["If the seller does not resolve it, consider the appropriate consumer grievance or consumer commission route for the value and facts."],
        questions: hasFollowUp ? [] : ["What did you buy, when did you buy it, and what remedy have you already requested from the seller?"],
      };
    case "employment dispute":
      return {
        actions: [
          "Collect your offer letter or contract, payslips, attendance records, policies, emails and the disputed notice or decision.",
          "Write a dated account of the unpaid wages, termination, discrimination or other workplace issue.",
          "Ask the employer in writing for the decision, amount due and reasons, and preserve their response.",
        ],
        next: ["The route depends heavily on whether the employer is public or private and on the nature of your work, so get tailored labour-law advice before missing a deadline."],
        questions: !hasFollowUp ? ["Is your employer a government/public authority or a private organisation?"] : !/\b(assam|bihar|delhi|goa|gujarat|haryana|karnataka|kerala|maharashtra|odisha|punjab|rajasthan|tamil nadu|telangana|uttar pradesh|west bengal)\b/i.test(issue) ? ["Which state were you employed in?"] : [],
      };
    case "arrest or detention":
      return {
        actions: [
          "Ask clearly whether you are under arrest and request the grounds for the arrest or detention.",
          "Ask to contact a lawyer and have a relative or trusted person informed of where you are being held.",
          "Record the officers' names, police station, time and any documents provided when it is safe to do so.",
        ],
        next: ["If you cannot reach a lawyer, ask for legal aid and do not sign a statement you do not understand."],
        questions: hasFollowUp ? [] : ["Have you been formally arrested, and were you told the grounds?"],
      };
    default:
      return {
        actions: [
          "Write a dated account of what happened, who was involved and what outcome you want.",
          "Preserve relevant notices, messages, photographs, receipts and screenshots.",
          "Ask for important decisions or refusals in writing where it is safe to do so.",
        ],
        next: ["A qualified lawyer or legal aid service can help identify the correct remedy when important facts or deadlines are unclear."],
        questions: [],
      };
  }
}

function routeDecision(category: string, issue: string) {
  const sexualViolence = /rap(?:e|ed|ing)|sexual assault|sexual violence/i.test(issue);
  const criminal = /violence|attack|threat|stalk|sexual harass|assault|rap(?:e|ed|ing)|extort|theft|stole|fraud|cheat|intimidat|confine|kidnap/i.test(issue);
  const immediateRisk = emergencyTerms.test(issue);
  const cyber = /online|cyber|hacked|account|social media|whatsapp|email|digital data|identity theft|otp/i.test(issue) && criminal;
  const policeMentioned = /police/i.test(issue);
  const vaguePoliceFailure = /police (?:aren't|are not|isn't|is not|won't|will not).*help/i.test(issue) && !criminal && !/complaint|fir|written|verbal/i.test(issue);
  const publicAuthority = /government|public authority|municipal|corporation|department|officer|police/i.test(issue);
  const informationGoal = /status|copy|copies|record|file noting|file movement|inspection report|action taken|order|official correspondence|who is handling/i.test(issue);
  const actionGoal = /take action|resolve|stop|remove|approve|issue|grant|refund|pay/i.test(issue);
  const legalNotice = /legal notice|summons|court notice/i.test(issue);
  const substantial = /₹\s?(?:[1-9]\d{5,}|\d+\s*(?:lakh|crore))|property|ownership|termination|dismissed/i.test(issue);
  const rejected = /rejected|refused|no response|nothing happened|not responded|ignored my complaint/i.test(issue);

  let policeStatus: PoliceHelpStatus = "not_primary_route";
  let policeReason = "The facts currently describe a civil, employment, consumer or administrative issue rather than apparent criminal conduct.";
  if (vaguePoliceFailure) {
    policeStatus = "insufficient_information";
    policeReason = "What the police were asked to address and whether a written complaint exists will determine the appropriate next step.";
  } else if (immediateRisk || criminal) {
    policeStatus = "recommended";
    policeReason = sexualViolence ? "Sexual violence is potentially serious criminal conduct. Your safety and access to appropriate support take priority." : immediateRisk ? "You described an immediate safety risk, so personal safety takes priority over the underlying dispute." : "The facts mention conduct such as threats, violence, fraud or another potentially criminal act.";
  } else if (policeMentioned) {
    policeStatus = "possibly_relevant";
    policeReason = "Police involvement may matter, but the current facts do not identify the potentially criminal conduct clearly enough.";
  }

  let lawyerStatus: LawyerHelpStatus = "not_yet_necessary";
  let lawyerReason = "Start by preserving evidence and using the appropriate written complaint or representation; legal review may become useful if that fails.";
  if (immediateRisk || /arrest|detain|custody|summons/i.test(issue)) {
    lawyerStatus = "urgent";
    lawyerReason = "Liberty, safety or a formal proceeding may be involved, so prompt legal advice could materially affect what you do next.";
  } else if (legalNotice || substantial || /limitation|deadline|tribunal|writ|court|disputed facts/i.test(issue)) {
    lawyerStatus = "recommended";
    lawyerReason = legalNotice ? "A formal notice or summons may carry a response deadline and your reply could affect later proceedings." : "The amount, property, employment consequence or possible formal proceeding makes tailored legal assessment important.";
  } else if (rejected || category === "private debt or contractual dispute" || category === "employment dispute") {
    lawyerStatus = "useful";
    lawyerReason = "A lawyer can assess the evidence, identify the correct forum and decide whether a formal notice or proceeding is proportionate.";
  }

  const rtiRelevant = publicAuthority && informationGoal;
  const rtiReason = rtiRelevant
    ? "An RTI may help obtain existing records held by the public authority. It cannot itself compel the authority to resolve the grievance."
    : publicAuthority && actionGoal
      ? "You appear to be asking the authority to act. A written grievance or representation is the primary tool; RTI is for obtaining existing government-held information."
      : "RTI is not the primary tool for this private dispute or for requesting a remedy rather than existing government-held information.";

  let formalType: FormalActionType = "representation";
  let formalReason = "A written representation creates a clear record of the facts, requested action and date of submission.";
  let prerequisites = ["Preserve the supporting records", "State the facts and requested outcome clearly", "Keep proof of submission"];
  if (criminal) {
    formalType = "complaint";
    formalReason = cyber ? "A police complaint and potentially a cybercrime complaint may be relevant because the reported conduct is both digital and potentially criminal." : "A police complaint may be relevant because the reported conduct could be criminal.";
    prerequisites = ["Preserve messages, call logs, images and identifying details", "Record dates, locations and witnesses", "Prioritise immediate safety"];
  } else if (category === "consumer dispute") {
    formalType = "grievance";
    formalReason = "Start with a documented seller grievance; a consumer complaint may become relevant if it is not resolved.";
  } else if (rtiRelevant) {
    formalType = "rti";
    formalReason = "RTI may obtain the existing official records needed to understand what happened before choosing a remedy.";
  } else if (category === "private debt or contractual dispute" && rejected) {
    formalType = "legal_notice";
    formalReason = "A lawyer can assess whether a formal legal notice is proportionate after written repayment requests have failed.";
  }

  const route = immediateRisk ? "Prioritise safety and seek police assistance now."
    : legalNotice ? "Have a lawyer review the notice before you respond."
      : criminal ? (cyber ? "Preserve the digital evidence and consider police and cybercrime complaints." : "Preserve the evidence and consider a police complaint.")
        : rtiRelevant ? "Request the existing records through RTI, separately from any grievance seeking action."
          : category === "consumer dispute" ? "Start with a written complaint to the seller or service provider."
            : category === "employment dispute" ? "Start with a written complaint or representation to the employer."
              : category === "private debt or contractual dispute" ? "Start with a documented written repayment request."
                : category === "tenancy or contractual dispute" ? "Start with a written deposit or tenancy demand and preserve proof of delivery."
                : publicAuthority ? "First send a written representation to the responsible authority."
                  : "Preserve the evidence and make a clear written request for the outcome you need.";
  const routeReason = immediateRisk ? policeReason : formalReason;
  const escalation = criminal
    ? ["Preserve evidence and address immediate safety", cyber ? "Make the appropriate police and/or cybercrime complaint" : "Make a written police complaint where appropriate", "Keep acknowledgement and record the response", "Seek legal advice if the risk continues or the complaint is not addressed"]
    : ["Preserve evidence", formalType === "rti" ? "Request the relevant existing records" : "Send the written complaint or representation", "Keep proof and allow a reasonable opportunity to respond", "Escalate to the relevant grievance authority, regulator or tribunal only if supported for this issue", "Ask a lawyer about formal proceedings if earlier steps fail"];

  return {
    police: { status: policeStatus, reason: policeReason },
    lawyer: { status: lawyerStatus, reason: lawyerReason },
    rti: { relevant: rtiRelevant, reason: rtiReason, possible_information_requests: rtiRelevant ? ["Current status of the application or complaint", "Date it was received and the officer or section handling it", "Copies of action-taken records, orders, communications or inspection reports where legally available"] : [] },
    formal: { type: formalType, reason: formalReason, prerequisites },
    best: { route, reason: routeReason },
    escalation,
    extraQuestion: vaguePoliceFailure ? "What did you approach the police about, and did you submit a written complaint or only speak to them verbally?" : "",
  };
}

export function generateGuidance(issue: string, debug = false): Guidance {
  const category = classify(issue);
  const categories = classifyAll(issue, category);
  const emergency = emergencyTerms.test(issue);
  const sexualViolence = /rap(?:e|ed|ing)|sexual assault|sexual violence/i.test(issue);
  const constitutionalQuery = sexualViolence ? "Article 21 life personal liberty" : issue;
  const retrieved = retriever.search(constitutionalQuery, 10);
  const statutoryGap = Object.hasOwn(statutory, category);
  const supported = statutoryGap ? [] : sexualViolence ? retrieved.filter((result) => isVerified(result) && result.chunk.article === "21") : retrieved.filter(isVerified).slice(0, 4);
  const rejected = retrieved.filter((result) => !isVerified(result));
  const playbook = categoryGuidance(category, issue);
  const decision = routeDecision(category, issue);
  const practical = practicalDetails(category, issue);
  const state = issue.match(/\b(Assam|Bihar|Delhi|Goa|Gujarat|Haryana|Karnataka|Kerala|Maharashtra|Odisha|Punjab|Rajasthan|Tamil Nadu|Telangana|Uttar Pradesh|West Bengal)\b/i)?.[1];
  const urgency: Guidance["urgency"] = emergency ? "emergency" : /arrest|detain|summons|evict.*(?:today|tomorrow)|deadline|within \d+ days/i.test(issue) ? "urgent" : /legal notice|account frozen|fired|terminated/i.test(issue) ? "time-sensitive" : "normal";
  const relevant_laws: RelevantLaw[] = supported.map((result) => ({
    source: result.chunk.title,
    provision: `Article ${result.chunk.article}`,
    title: result.chunk.heading.replace(/—.*$/, "").trim(),
    explanation: sexualViolence && result.chunk.article === "21" ? "Article 21 protects life and personal liberty. It is a relevant constitutional protection, but the specific offence, investigation and remedies depend on criminal-law sources that are not yet in this verified library." : `This provision says, in substance: ${sentence(result.chunk.text)} Its relevance depends on the full facts and on whether the action involves the State or a public authority.`,
    relevance: relevance(result.score),
    citation_chunk_ids: [result.chunk.chunkId],
  })).filter((law) => law.relevance === "direct" || law.relevance === "strong");
  const missingInformation = [decision.extraQuestion, ...playbook.questions].filter(Boolean).slice(0, 1);
  const immediateActions = sexualViolence ? [
    "Move to a place where you feel safer and contact someone you trust, if you can do so safely.",
    "Seek prompt medical care if you need or want it; your health and safety come before collecting evidence.",
    "Preserve messages, call details, photographs or other material already available to you, without putting yourself at further risk.",
    "Police assistance may be appropriate. If you choose to make a complaint, keep any acknowledgement or document you receive.",
  ] : decision.police.status === "recommended" ? [
    "If you believe violence may be imminent, move to a safer place and contact someone you trust.",
    "Preserve the threatening messages, call logs, recordings lawfully available to you, and details of witnesses.",
    "Consider making a written police complaint because the threats may be criminal; keep proof of submission.",
    ...playbook.actions,
  ].slice(0, 6) : /legal notice|summons|court notice/i.test(issue) ? [
    "Note the response or appearance date shown on the document.",
    "Preserve the complete document, envelope, delivery details and records relating to the allegations.",
    "Arrange prompt legal review before responding or signing anything.",
  ] : playbook.actions;
  const confidence: Guidance["confidence"] = statutoryGap ? "low" : missingInformation.length ? "medium" : "high";
  const caseState: Guidance["case_state"] = {
    originalIssue: issue.split(/\n\nFollow-up question:/i)[0],
    jurisdiction: { country: "India", ...(state ? { state } : {}) },
    parties: { opposingPartyType: /government|public authority|department|municipal/i.test(issue) ? "public authority" : /employer|company/i.test(issue) ? "employer" : /landlord/i.test(issue) ? "landlord" : /seller|platform/i.test(issue) ? "seller or platform" : "private party" },
    issueCategories: categories,
    facts: { emergency, publicAuthorityInvolved: /government|public authority|department|municipal|police/i.test(issue), state: state || null },
    knownFacts: issue.split(/\n+/).filter((line) => line && !/^follow-up question:/i.test(line)).slice(0, 6),
    missingMaterialFacts: missingInformation,
    urgency,
    legalDomains: categories,
    possibleRemedies: [decision.formal.type, ...(decision.rti.relevant ? ["rti"] : []), ...(decision.police.status === "recommended" ? ["police complaint"] : [])],
    retrievedSources: relevant_laws.flatMap((law) => law.citation_chunk_ids),
    confidence: confidence === "high" ? .9 : confidence === "medium" ? .65 : .35,
  };

  return {
    emergency,
    emergency_guidance: emergency ? ["Move to a safer place if you can do so safely.", "Contact a trusted person nearby.", "Seek local emergency help. This database does not yet contain a verified emergency-resources directory, so no phone number is shown."] : undefined,
    issue_summary: `This appears to involve ${categories.slice(0, 3).join(", ").toLowerCase()}.`,
    issue_category: category,
    issue_categories: categories,
    urgency,
    confidence,
    immediate_actions: immediateActions,
    evidence_to_preserve: practical.evidence,
    avoid_actions: practical.avoid,
    best_next_route: decision.best,
    police_help: decision.police,
    lawyer_help: decision.lawyer,
    rti: decision.rti,
    formal_action: decision.formal,
    escalation_path: decision.escalation,
    relevant_laws,
    next_steps: playbook.next,
    missing_information: missingInformation,
    limitations: sexualViolence
      ? "The verified library currently contains the Constitution of India, so Article 21 can be shown. It does not yet contain the criminal statutes and verified procedural sources needed to explain the specific offence, investigation process, filing procedure or remedies. This source limitation does not mean legal protections are absent."
      : statutoryGap
      ? `This appears primarily to be a ${category}. Our verified library currently covers the Constitution of India, not the legislation and procedures that supply the specific remedy for this issue. The practical steps above are general preparation, not a statement of the law that applies to your case.`
      : "This guidance is limited to provisions retrieved from the Constitution of India. Other statutes, rules, judgments and State-specific procedures are not yet in the database.",
    professional_help_recommended: emergency || /arrest|detain|violence|fired/i.test(issue),
    case_state: caseState,
    ...(debug ? { debug: {
      classifiedIssue: category,
      searchQueries: [constitutionalQuery],
      retrievedChunks: retrieved.map((result) => ({ id: result.chunk.chunkId, article: result.chunk.article, score: +result.score.toFixed(4), keywordScore: +result.keywordScore.toFixed(4), semanticScore: +result.semanticScore.toFixed(4) })),
      provisionsSupplied: supported.map((result) => `Article ${result.chunk.article}`),
      finalCitations: supported.map((result) => result.chunk.chunkId),
      rejectedCitations: rejected.map((result) => result.chunk.chunkId),
      extractedFacts: caseState.knownFacts,
      assumptions: [`Primary issue inferred as ${category}`],
      jurisdiction: caseState.jurisdiction,
      materialMissingFacts: caseState.missingMaterialFacts,
      questionSelected: missingInformation[0] || null,
      confidence: caseState.confidence,
    } } : {}),
  };
}
