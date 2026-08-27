import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/600.css";
import "@fontsource/roboto/700.css";
import "./globals.css";
export async function generateMetadata():Promise<Metadata>{const h=await headers();const host=h.get("x-forwarded-host")||h.get("host")||"localhost:3000";const protocol=h.get("x-forwarded-proto")||"http";const image=`${protocol}://${host}/og.png`;return{title:"Nyaaya — Understand your legal options",description:"Plain-language legal guidance grounded in verified Indian law.",icons:{icon:"/favicon.svg"},openGraph:{title:"Nyaaya — Understand your legal options",description:"Tell us what happened. Understand your rights and know your options.",images:[image]},twitter:{card:"summary_large_image",title:"Nyaaya — Understand your legal options",description:"Tell us what happened. Understand your rights and know your options.",images:[image]}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
