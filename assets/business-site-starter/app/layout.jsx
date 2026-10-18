import './globals.css';import Chrome from '../components/Chrome';import {site,robots} from '../lib/site';
export const metadata={title:{default:site.business.name,template:`%s | ${site.business.name}`},description:site.business.description,robots};
export default function RootLayout({children}){return <html lang="en"><body style={{'--accent':site.brand.accent,'--ink':site.brand.ink,'--paper':site.brand.paper}}><Chrome>{children}</Chrome></body></html>}
