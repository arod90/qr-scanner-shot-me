# tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */ module.exports = { content: [ './pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}', ], theme: { extend: { backgroundImage: { 'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))', 'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))', }, fontFamily: { oswald: ['Oswald', 'sans-serif'], 'bebas-neue': ['Bebas Neue', 'sans-serif'], }, }, }, plugins: [], };
```

# README.md

```md
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). ## Getting Started First, run the development server: \`\`\`bash npm run dev # or yarn dev # or pnpm dev # or bun dev \`\`\` Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file. This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font. ## Learn More To learn more about Next.js, take a look at the following resources: - [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API. - [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial. You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome! ## Deploy on Vercel The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js. Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
```

# postcss.config.mjs

```mjs
/** @type {import('postcss-load-config').Config} */ const config = { plugins: { tailwindcss: {}, }, }; export default config;
```

# package.json

```json
{ "name": "qr-scan", "version": "0.1.0", "private": true, "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint" }, "dependencies": { "@supabase/supabase-js": "^2.45.0", "@zxing/browser": "^0.1.5", "ai-digest": "^1.0.5", "date-fns": "^3.6.0", "html5-qrcode": "^2.3.8", "next": "14.2.5", "qr-scanner": "^1.4.2", "react": "^18", "react-datepicker": "^7.3.0", "react-dom": "^18", "react-icons": "^5.2.1", "react-webcam": "^7.2.0" }, "devDependencies": { "eslint": "^8", "eslint-config-next": "14.2.5", "postcss": "^8", "tailwindcss": "^3.4.1" } }
```

# next.config.mjs

```mjs
/** @type {import('next').NextConfig} */ const nextConfig = {}; export default nextConfig;
```

# jsconfig.json

```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

# .gitignore

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files. # dependencies /node_modules /.pnp .pnp.js .yarn/install-state.gz # testing /coverage # next.js /.next/ /out/ # production /build # misc .DS_Store *.pem # debug npm-debug.log* yarn-debug.log* yarn-error.log* # local env files .env*.local # vercel .vercel # typescript *.tsbuildinfo next-env.d.ts
```

# .eslintrc.json

```json
{ "extends": "next/core-web-vitals" }
```

# public\vercel.svg

This is a file of the type: SVG Image

# public\success-chime.mp3

This is a binary file of the type: Binary

# public\next.svg

This is a file of the type: SVG Image

# lib\supabaseClient.js

```js
import { createClient } from '@supabase/supabase-js'; const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

# app\page.js

```js
'use client'; import React, { useState, useEffect, useRef } from 'react'; import { supabase } from '../lib/supabaseClient'; import DatePicker from 'react-datepicker'; import { format, isSameDay } from 'date-fns'; import { IoLocationOutline } from 'react-icons/io5'; import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'; import { Html5Qrcode } from 'html5-qrcode'; import 'react-datepicker/dist/react-datepicker.css'; import './calendar.css'; export default function Home() { const [selectedDate, setSelectedDate] = useState(new Date()); const [showCalendar, setShowCalendar] = useState(false); const [selectedEvent, setSelectedEvent] = useState(null); const [events, setEvents] = useState([]); const [showScanner, setShowScanner] = useState(false); const [scanResult, setScanResult] = useState(null); const [admittedPeople, setAdmittedPeople] = useState([]); const scannerRef = useRef(null); const audioRef = useRef(null); // !TODO the users admitted list stays present even if I jump to a different event, thjis list should be unique for each event. useEffect(() => { fetchEvents(); }, []); useEffect(() => { if (showScanner && !scannerRef.current) { scannerRef.current = new Html5Qrcode('reader'); startScanner(); } else if (!showScanner && scannerRef.current) { scannerRef.current.stop().then(() => { scannerRef.current = null; }); } }, [showScanner]); const startScanner = () => { if (scannerRef.current) { scannerRef.current .start( { facingMode: 'environment' }, { fps: 10, qrbox: 250, }, onScanSuccess, onScanError ) .catch((err) => { console.error('Failed to start scanner:', err); // Show a user-friendly message alert( 'Camera access is required to scan QR codes. Please allow camera access and try again.' ); }); } }; async function fetchEvents() { const { data, error } = await supabase .from('events') .select('*') .order('event_date', { ascending: true }); if (error) console.error('Error fetching events:', error); else setEvents(data); } const onScanSuccess = async (decodedText) => { if (selectedEvent) { if (scannerRef.current) { scannerRef.current.pause(true); } try { const { data: ticket, error } = await supabase .from('userevents') .select('*, events(event_name), users(first_name, last_name)') .eq('qr_code', decodedText) .single(); if (error) throw error; if (ticket.event_id !== selectedEvent.id) { setScanResult({ status: 'error', message: `This ticket is for event "${ticket.events.event_name}" and not valid for this event.`, }); } else if (ticket.used) { setScanResult({ status: 'error', message: 'Ticket already used' }); } else { const { error: updateError } = await supabase .from('userevents') .update({ used: true }) .eq('id', ticket.id); if (updateError) throw updateError; setScanResult({ status: 'success', message: `Valid ticket. Entry granted for ${ticket.users.first_name} ${ticket.users.last_name}.`, }); await fetchAdmittedPeople(); if (audioRef.current) { audioRef.current.play(); } } } catch (error) { console.error('Error:', error); setScanResult({ status: 'error', message: 'Invalid ticket' }); } setShowScanner(false); } }; const onScanError = (error) => { console.warn(error); }; async function fetchAdmittedPeople() { if (!selectedEvent) return; const { data, error } = await supabase .from('userevents') .select('*, users(first_name, last_name)') .eq('event_id', selectedEvent.id) .eq('used', true) .order('purchase_date', { ascending: false }); if (error) console.error('Error fetching admitted people:', error); else setAdmittedPeople(data); } const handleScannerToggle = () => { setShowScanner(!showScanner); setScanResult(null); }; const handleDateChange = (date) => { setSelectedDate(date); setSelectedEvent(null); setScanResult(null); setShowCalendar(false); }; const getEventsForSelectedDate = () => { return events.filter((event) => isSameDay(new Date(event.event_date), selectedDate) ); }; const hasEventOnDate = (date) => { return events.some((event) => isSameDay(new Date(event.event_date), date)); }; return ( <div className="container mx-auto p-4 max-w-md bg-black text-white min-h-screen"> <h1 className="text-4xl font-bold mb-4 text-left text-white font-bebas-neue"> {format(selectedDate, 'MMMM d, yyyy')} </h1> <button className="mb-4 p-2 bg-[#333333] text-white rounded w-full font-oswald" onClick={() => setShowCalendar(!showCalendar)} > {showCalendar ? 'Hide Calendar' : 'Change Date'} </button> {showCalendar && ( <div className="mb-4"> <DatePicker selected={selectedDate} onChange={handleDateChange} inline className="!bg-[#333333] !text-white" renderDayContents={(day, date) => ( <div className="relative"> {day} {hasEventOnDate(date) && <div className="event-dot"></div>} </div> )} /> </div> )} <select className="mb-4 p-2 border rounded w-full text-white bg-[#333333] font-oswald" value={selectedEvent?.id || ''} onChange={(e) => { const event = events.find((ev) => ev.id === e.target.value); setSelectedEvent(event); fetchAdmittedPeople(); setScanResult(null); }} > <option value="">Select an event</option> {getEventsForSelectedDate().map((event) => ( <option key={event.id} value={event.id}> {event.event_name} - {format(new Date(event.event_date), 'HH:mm')} </option> ))} </select> {selectedEvent && ( <> <div className="mb-4 text-left"> <h2 className="text-3xl font-bold text-white font-bebas-neue"> {selectedEvent.event_name} </h2> <div className="flex items-center text-[#B0B0B0] font-oswald"> <IoLocationOutline className="text-[#FF5252]" size={20} /> <span className="ml-1">{selectedEvent.location}</span> </div> </div> <button className="mb-4 p-2 bg-[#FF5252] text-white rounded w-full font-oswald" onClick={handleScannerToggle} > {showScanner ? 'Hide Scanner' : 'Show Scanner'} </button> {showScanner && <div id="reader" className="mb-4"></div>} {scanResult && ( <div className={`mb-4 p-4 rounded text-center ${ scanResult.status === 'success' ? 'bg-green-700' : 'bg-red-700' } font-oswald flex items-center justify-center scan-result`} > {scanResult.status === 'success' ? ( <FaCheckCircle size={24} className="mr-2" /> ) : ( <FaTimesCircle size={24} className="mr-2" /> )} <span>{scanResult.message}</span> </div> )} <h2 className="text-2xl font-bold mb-2 text-white font-bebas-neue"> Admitted People </h2> <ul className="divide-y divide-gray-700 font-oswald"> {admittedPeople.map((ticket) => ( <li key={ticket.id} className="py-2"> {ticket.users.first_name} {ticket.users.last_name} -{' '} {new Date(ticket.purchase_date).toLocaleTimeString()} </li> ))} </ul> </> )} <audio ref={audioRef} src="/success-chime.mp3" /> </div> ); }
```

# app\layout.js

```js
import { Oswald, Bebas_Neue } from 'next/font/google'; import './globals.css'; const oswald = Oswald({ subsets: ['latin'] }); const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], }); export default function RootLayout({ children }) { return ( <html lang="en"> <body className={`${oswald.variable} ${bebasNeue.variable} bg-black text-white`} > {children} </body> </html> ); }
```

# app\globals.css

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'); @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@200..700&display=swap'); @tailwind base; @tailwind components; @tailwind utilities; :root { --foreground-rgb: 0, 0, 0; --background-start-rgb: 214, 219, 220; --background-end-rgb: 255, 255, 255; --font-oswald: 'Oswald', sans-serif; --font-bebas-neue: 'Bebas Neue', sans-serif; } @media (prefers-color-scheme: dark) { :root { --foreground-rgb: 255, 255, 255; --background-start-rgb: 0, 0, 0; --background-end-rgb: 0, 0, 0; } } body { color: rgb(var(--foreground-rgb)); background: linear-gradient( to bottom, transparent, rgb(var(--background-end-rgb)) ) rgb(var(--background-start-rgb)); } @layer utilities { .text-balance { text-wrap: balance; } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .scan-result { animation: fadeIn 0.5s ease-in-out; }
```

# app\favicon.ico

This is a binary file of the type: Binary

# app\calendar.css

```css
.react-datepicker { font-family: var(--font-oswald) !important; } .react-datepicker, .react-datepicker__header { background-color: #333333 !important; color: white !important; border-color: #555555 !important; } .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name { color: white !important; } .react-datepicker__day:hover, .react-datepicker__month-text:hover, .react-datepicker__quarter-text:hover, .react-datepicker__year-text:hover { background-color: #ff5252 !important; } .react-datepicker__day--selected, .react-datepicker__day--in-selecting-range, .react-datepicker__day--in-range, .react-datepicker__month-text--selected, .react-datepicker__month-text--in-selecting-range, .react-datepicker__month-text--in-range, .react-datepicker__quarter-text--selected, .react-datepicker__quarter-text--in-selecting-range, .react-datepicker__quarter-text--in-range, .react-datepicker__year-text--selected, .react-datepicker__year-text--in-selecting-range, .react-datepicker__year-text--in-range { background-color: #ff5252 !important; color: white !important; } .react-datepicker__day--keyboard-selected, .react-datepicker__month-text--keyboard-selected, .react-datepicker__quarter-text--keyboard-selected, .react-datepicker__year-text--keyboard-selected { background-color: #ff5252 !important; color: white !important; } .event-dot { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background-color: #ff5252; border-radius: 50%; }
```

