import type { Metadata } from 'next';
export const metadata:Metadata={title:'Egina · Gemeinsam im Urlaub',description:'Einkaufen, teilen, entspannen. Eure gemeinsame Einkaufsliste und Urlaubskasse.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="de"><body style={{margin:0}}>{children}</body></html>}
