import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
const geist=Geist({variable:"--font-sans",subsets:["latin"]});
const serif=Cormorant_Garamond({variable:"--font-serif",subsets:["latin"],weight:["500","600"]});
export async function generateMetadata():Promise<Metadata>{const h=await headers();const host=h.get("x-forwarded-host")||h.get("host")||"localhost:3000";const protocol=h.get("x-forwarded-proto")||"http";const image=`${protocol}://${host}/og.png`;return{title:"Nyaaya — Understand your legal options",description:"Plain-language legal guidance grounded in verified Indian law.",icons:{icon:"/favicon.svg"},openGraph:{title:"Nyaaya — Understand your legal options",description:"Tell us what happened. Understand your rights and know your options.",images:[image]},twitter:{card:"summary_large_image",title:"Nyaaya — Understand your legal options",description:"Tell us what happened. Understand your rights and know your options.",images:[image]}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body className={`${geist.variable} ${serif.variable}`}>{children}</body></html>}
