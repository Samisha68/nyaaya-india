export type Relevance="direct"|"possible"|"contextual";
export interface LegalChunk{chunkId:string;id:string;title:string;type:string;jurisdiction:string;authority:string;sourceUrl:string;sourceDocument:string;article?:string;section?:string|null;heading:string;text:string;embedding:number[]}
export interface RetrievedChunk{chunk:LegalChunk;score:number;keywordScore:number;semanticScore:number}
export interface RelevantLaw{source:string;provision:string;title:string;explanation:string;relevance:Relevance;citation_chunk_ids:string[]}
export interface Guidance{emergency:boolean;emergency_guidance?:string[];issue_summary:string;issue_category:string;urgency:"normal"|"important"|"urgent";immediate_actions:string[];relevant_laws:RelevantLaw[];next_steps:string[];missing_information:string[];limitations:string;professional_help_recommended:boolean;debug?:unknown}
